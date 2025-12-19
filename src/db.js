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

    // VERSION KO 2 RAKHA HAI
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

/**
 * 🆕 DELETE TEST FUNCTION (Required for the delete button to work)
 * @param {number} id - The ID of the test to delete
 */
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
    store.clear().onsuccess = () => {
      // Sections array handle karna (Strings or Objects)
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

/**
 * 🆕 DELETE SECTION FUNCTION
 * @param {number} id - The ID of the section to delete
 */
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