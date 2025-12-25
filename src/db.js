// src/db.js

export const openDB = () => {
  return new Promise((resolve, reject) => {
    // Persistent Storage request
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((persistent) => {
        if (persistent) {
          console.log("✅ Storage is persistent.");
        } else {
          console.log("⚠️ Storage is not persistent.");
        }
      });
    }

    // Version ko humesha update rakhein agar schema badle
    const request = indexedDB.open("QuizDatabase", 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Tests Store
      if (!db.objectStoreNames.contains("tests")) {
        db.createObjectStore("tests", { keyPath: "id", autoIncrement: true });
      }

      // 2. Sections Store
      if (!db.objectStoreNames.contains("sections")) {
        db.createObjectStore("sections", { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("IndexedDB open error");
  });
};

// --- Test Data Functions ---

export const saveTestToDB = async (testData) => {
  const db = await openDB();
  const tx = db.transaction("tests", "readwrite");
  const store = tx.objectStore("tests");
  
  testData.createdAt = new Date().toISOString();
  
  return new Promise((resolve, reject) => {
    const request = store.add(testData);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject("Error saving to DB");
  });
};

/**
 * 🆕 UPDATE TEST SCORE FUNCTION
 * Ye function quiz ke results aur user ke answers ko save karne ke liye hai.
 */
export const updateTestScore = async (id, scoreData) => {
  const db = await openDB();
  const tx = db.transaction("tests", "readwrite");
  const store = tx.objectStore("tests");

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const data = getRequest.result;
      if (data) {
        // latestScore mein correct, wrong, skipped aur userAnswers array save hoga
        data.latestScore = scoreData;
        const updateRequest = store.put(data);
        updateRequest.onsuccess = () => resolve(true);
        updateRequest.onerror = () => reject("Failed to update score");
      } else {
        reject("Test not found");
      }
    };
    getRequest.onerror = () => reject("Error fetching test for update");
  });
};

export const getAllTestsFromDB = async () => {
  const db = await openDB();
  const tx = db.transaction("tests", "readonly");
  const store = tx.objectStore("tests");
  
  return new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });
};

export const deleteTestFromDB = async (id) => {
  const db = await openDB();
  const tx = db.transaction("tests", "readwrite");
  const store = tx.objectStore("tests");
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => {
      console.log(`Test with ID ${id} deleted successfully.`);
      resolve(true);
    };
    request.onerror = () => reject("Error deleting test from DB");
  });
};

// --- Section Data Functions ---

export const saveSectionsToDB = async (sections) => {
  const db = await openDB();
  const tx = db.transaction("sections", "readwrite");
  const store = tx.objectStore("sections");
  
  return new Promise((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      sections.forEach(item => {
        const sectionData = typeof item === 'string' ? { name: item } : item;
        store.add(sectionData);
      });
      resolve(true);
    };
    tx.onerror = () => reject("Error syncing sections");
  });
};

export const getAllSectionsFromDB = async () => {
  const db = await openDB();
  const tx = db.transaction("sections", "readonly");
  const store = tx.objectStore("sections");
  
  return new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });
};

export const deleteSectionFromDB = async (id) => {
  const db = await openDB();
  const tx = db.transaction("sections", "readwrite");
  const store = tx.objectStore("sections");
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject("Error deleting section");
  });
};