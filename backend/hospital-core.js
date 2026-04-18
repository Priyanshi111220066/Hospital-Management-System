const { v4: uuidv4 } = require('uuid');

class Patient {
    constructor(patient_id, name, severity, arrival_time, distance_km, age, condition, assigned_bed = null) {
        this.patient_id = patient_id;
        this.name = name;
        this.severity = severity;
        this.arrival_time = arrival_time;
        this.distance_km = distance_km;
        this.age = age;
        this.condition = condition;
        this.assigned_bed = assigned_bed;
    }

    priorityScore(current_time) {
        const waiting_minutes = (current_time - this.arrival_time) / 60;
        const severity_score = this.severity * 40;
        const waiting_score = Math.min(waiting_minutes * 0.5, 30);
        const distance_score = Math.max(0, 20 - this.distance_km * 0.5);
        const age_score = (this.age >= 65 || this.age <= 5) ? 10 : 0;
        return severity_score + waiting_score + distance_score + age_score;
    }
}

class PriorityQueue {
    constructor() {
        this.heap = [];
        this.counter = 0;
    }

    push(patient, current_time) {
        const score = patient.priorityScore(current_time);
        this.heap.push([-score, this.counter++, patient]);
        this.heapifyUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return null;
        
        const result = this.heap[0][2];
        const end = this.heap.pop();
        
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.heapifyDown(0);
        }
        return result;
    }

    heapifyUp(index) {
        const element = this.heap[index];
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parent = this.heap[parentIndex];
            
            if (-parent[0] <= -element[0]) {
                break;
            }
            
            this.heap[parentIndex] = element;
            this.heap[index] = parent;
            index = parentIndex;
        }
    }

    heapifyDown(index) {
        const size = this.heap.length;
        const element = this.heap[index];
        
        while (true) {
            let leftChildIndex = 2 * index + 1;
            let rightChildIndex = 2 * index + 2;
            let leftChild, rightChild;
            let swap = null;

            if (leftChildIndex < size) {
                leftChild = this.heap[leftChildIndex];
                if (-leftChild[0] > -element[0]) {
                    swap = leftChildIndex;
                }
            }

            if (rightChildIndex < size) {
                rightChild = this.heap[rightChildIndex];
                if ((swap === null && -rightChild[0] > -element[0]) ||
                    (swap !== null && -rightChild[0] > -this.heap[swap][0])) {
                    swap = rightChildIndex;
                }
            }

            if (swap == null) break;

            this.heap[index] = this.heap[swap];
            this.heap[swap] = element;
            index = swap;
        }
    }

    reorder(current_time) {
        const patients = this.heap.map(item => item[2]);
        this.heap = [];
        this.counter = 0;
        patients.forEach(p => this.push(p, current_time));
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    size() {
        return this.heap.length;
    }

    getAllSorted(current_time) {
        return this.heap
            .map(item => item[2])
            .sort((a, b) => b.priorityScore(current_time) - a.priorityScore(current_time));
    }

    remove(patient_id) {
        const index = this.heap.findIndex(item => item[2].patient_id === patient_id);
        if (index !== -1) {
            const end = this.heap.pop();
            if (index < this.heap.length) {
                this.heap[index] = end;
                this.heapifyDown(index);
                this.heapifyUp(index);
            }
        }
    }
}

class Bed {
    constructor(bed_id, ward) {
        this.bed_id = bed_id;
        this.ward = ward;
        this.is_available = true;
        this.assigned_patient_id = null;
        this.assigned_at = null;
    }

    assign(patient_id, current_time) {
        this.is_available = false;
        this.assigned_patient_id = patient_id;
        this.assigned_at = current_time;
    }

    release() {
        this.is_available = true;
        this.assigned_patient_id = null;
        this.assigned_at = null;
    }
}

class Ward {
    constructor(name, capacity) {
        this.name = name;
        this.beds = {};
        for (let i = 1; i <= capacity; i++) {
            const bed_id = `${name}-B${i.toString().padStart(2, '0')}`;
            this.beds[bed_id] = new Bed(bed_id, name);
        }
    }

    availableBeds() {
        return Object.values(this.beds).filter(bed => bed.is_available);
    }

    getAvailableBed() {
        const available = this.availableBeds();
        return available.length > 0 ? available[0] : null;
    }

    capacity() {
        return Object.keys(this.beds).length;
    }

    occupancy() {
        return Object.values(this.beds).filter(bed => !bed.is_available).length;
    }
}

class HospitalSystem {
    constructor() {
        this.SEVERITY_LABELS = {
            1: "Minor", 2: "Moderate", 3: "Serious", 
            4: "Critical", 5: "Life-Threatening"
        };
        
        this.wards = {
            "ICU": new Ward("ICU", 5),
            "Emergency": new Ward("Emergency", 8),
            "General": new Ward("General", 15),
        };
        
        this.queue = new PriorityQueue();
        this.patients = {};
        this.allocation_log = [];
        this._counter = 0;
    }

    register(name, severity, distance_km, age, condition) {
        this._counter += 1;
        const pid = `P${this._counter.toString().padStart(4, '0')}`;
        
        if (this.patients[pid]) {
            throw new Error(`Patient ID ${pid} already exists.`);
        }
        
        const patient = new Patient(pid, name, severity, Date.now(), distance_km, age, condition);
        this.patients[pid] = patient;
        this.queue.push(patient, Date.now());
        return patient;
    }

    _wardPreferenceOrder(severity) {
        if (severity >= 4) return ["ICU", "Emergency", "General"];
        if (severity === 3) return ["Emergency", "ICU", "General"];
        return ["General", "Emergency", "ICU"];
    }

    allocateNext() {
        if (this.queue.isEmpty()) {
            return { status: "empty" };
        }

        this.queue.reorder(Date.now());
        let patient = this.queue.pop();
        
        let ward = null;
        for (const ward_name of this._wardPreferenceOrder(patient.severity)) {
            if (this.wards[ward_name].getAvailableBed()) {
                ward = this.wards[ward_name];
                break;
            }
        }

        if (!ward) {
            this.queue.push(patient, Date.now());
            return { status: "no_bed", patient };
        }

        const bed = ward.getAvailableBed();
        const now = Date.now();
        bed.assign(patient.patient_id, now);
        patient.assigned_bed = bed.bed_id;
        
        const wait = (now - patient.arrival_time) / 60;
        const score = patient.priorityScore(now);
        
        const entry = {
            status: "allocated",
            patient_id: patient.patient_id,
            name: patient.name,
            severity: patient.severity,
            severity_label: this.SEVERITY_LABELS[patient.severity],
            condition: patient.condition,
            age: patient.age,
            distance_km: patient.distance_km,
            ward: ward.name,
            bed_id: bed.bed_id,
            score: Math.round(score * 10) / 10,
            wait_min: Math.round(wait * 10) / 10,
            time: new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            })
        };

        this.allocation_log.push(entry);
        return entry;
    }

    _findBed(bed_id) {
        const normalized_id = bed_id.trim().toUpperCase();
        for (const ward of Object.values(this.wards)) {
            for (const bed of Object.values(ward.beds)) {
                if (bed.bed_id.trim().toUpperCase() === normalized_id) {
                    return bed;
                }
            }
        }
        return null;
    }

    releasePatient(patient_id) {
        const search_id = patient_id.trim().toUpperCase();
        const patient = this.patients[search_id];
        
        if (!patient || !patient.assigned_bed) {
            return false;
        }

        const bed = this._findBed(patient.assigned_bed);
        if (!bed || bed.is_available) {
            return false;
        }
        
        if (bed.assigned_patient_id !== search_id) {
            return false;
        }

        bed.release();
        patient.assigned_bed = null;
        
        this.allocation_log = this.allocation_log.filter(
            entry => entry.patient_id !== search_id
        );
        
        return true;
    }

    totalAvailable() {
        return Object.values(this.wards).reduce(
            (sum, ward) => sum + (ward.capacity() - ward.occupancy()), 0
        );
    }

    totalCapacity() {
        return Object.values(this.wards).reduce(
            (sum, ward) => sum + ward.capacity(), 0
        );
    }

    reset() {
        this.wards = {
            "ICU": new Ward("ICU", 5),
            "Emergency": new Ward("Emergency", 8),
            "General": new Ward("General", 15),
        };
        this.queue = new PriorityQueue();
        this.patients = {};
        this.allocation_log = [];
        this._counter = 0;
    }
}

module.exports = HospitalSystem;
