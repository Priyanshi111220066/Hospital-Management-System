const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const HospitalSystem = require('./hospital-core');

const app = express();
const PORT = process.env.PORT || 5000;
const hospital = new HospitalSystem();

// Middleware
app.use(helmet());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// System status
app.get('/api/status', (req, res) => {
    res.json({
        available: hospital.totalAvailable(),
        capacity: hospital.totalCapacity(),
        waiting: hospital.queue.size(),
        allocated: Object.values(hospital.wards).reduce(
            (sum, ward) => sum + ward.occupancy(), 0
        ),
        wards: {
            ICU: { capacity: hospital.wards.ICU.capacity(), occupancy: hospital.wards.ICU.occupancy() },
            Emergency: { capacity: hospital.wards.Emergency.capacity(), occupancy: hospital.wards.Emergency.occupancy() },
            General: { capacity: hospital.wards.General.capacity(), occupancy: hospital.wards.General.occupancy() }
        }
    });
});

// Register new patient
app.post('/api/patient', (req, res) => {
    const { name, severity, distance_km, age, condition } = req.body;
    
    if (!name || !condition || !age || severity < 1 || severity > 5) {
        return res.status(400).json({ 
            error: 'Invalid input: name, condition, age (1-129), and severity (1-5) required' 
        });
    }

    try {
        const patient = hospital.register(name, parseInt(severity), parseFloat(distance_km), parseInt(age), condition);
        res.json({ 
            success: true, 
            patient: {
                id: patient.patient_id,
                name: patient.name,
                severity: patient.severity
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Allocate next patient
app.post('/api/allocate-next', (req, res) => {
    const result = hospital.allocateNext();
    res.json(result);
});

// Allocate all patients
app.post('/api/allocate-all', (req, res) => {
    let count = 0;
    while (!hospital.queue.isEmpty()) {
        const result = hospital.allocateNext();
        if (result.status !== 'allocated') break;
        count++;
    }
    res.json({ success: true, allocated: count });
});

// Release patient
app.post('/api/release', (req, res) => {
    const { patient_id } = req.body;
    if (!patient_id) {
        return res.status(400).json({ error: 'Patient ID required' });
    }
    
    const success = hospital.releasePatient(patient_id);
    if (success) {
        res.json({ success: true, message: `Patient ${patient_id} released` });
    } else {
        res.status(404).json({ error: 'Patient not found or not assigned to bed' });
    }
});

// Get waiting queue
app.get('/api/queue', (req, res) => {
    const patients = hospital.queue.getAllSorted(Date.now());
    res.json(patients.map((p, index) => ({
        rank: index + 1,
        ...p,
        wait_minutes: Math.round(((Date.now() - p.arrival_time) / 60000) * 10) / 10,
        priority_score: Math.round(p.priorityScore(Date.now()) * 10) / 10
    })));
});

// Get allocation log
app.get('/api/log', (req, res) => {
    res.json(hospital.allocation_log.slice().reverse());
});

// Reset system
app.post('/api/reset', (req, res) => {
    hospital.reset();
    res.json({ success: true, message: 'System reset complete' });
});

// Load demo data
app.post('/api/demo', (req, res) => {
    const demoPatients = [
        { name: "Alice Monroe", age: 72, condition: "Cardiac Arrest", severity: 5, distance: 2.1 },
        { name: "Bob Carter", age: 45, condition: "Fractured Femur", severity: 3, distance: 8.5 },
        { name: "Carol Smith", age: 67, condition: "Stroke", severity: 4, distance: 1.3 },
        { name: "David Lee", age: 30, condition: "Severe Laceration", severity: 2, distance: 15.0 },
        { name: "Emma Johnson", age: 3, condition: "Respiratory Failure", severity: 5, distance: 0.8 },
        { name: "Frank Davis", age: 55, condition: "Mild Concussion", severity: 1, distance: 20.5 },
        { name: "Grace Kim", age: 80, condition: "Myocardial Infarction", severity: 4, distance: 5.2 },
        { name: "Henry Brown", age: 40, condition: "Appendicitis", severity: 3, distance: 12.3 },
        { name: "Isla Turner", age: 25, condition: "Severe Allergic Reaction", severity: 2, distance: 9.7 },
        { name: "James Wilson", age: 70, condition: "Traumatic Brain Injury", severity: 5, distance: 3.4 }
    ];

    demoPatients.forEach(patient => {
        try {
            hospital.register(patient.name, patient.severity, patient.distance, patient.age, patient.condition);
        } catch (e) {
            console.error('Demo patient error:', e.message);
        }
    });

    res.json({ success: true, loaded: demoPatients.length });
});

app.listen(PORT, () => {
    console.log(`🚨 Hospital Management System Backend`);
    console.log(`📍 Running on http://localhost:${PORT}`);
    console.log(`🔧 Health: http://localhost:${PORT}/health`);
    console.log(`💾 Demo data: POST http://localhost:${PORT}/api/demo`);
});
