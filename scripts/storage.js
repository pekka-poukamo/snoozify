import { testing } from '/scripts/testing.js'
import { getUID } from '/scripts/utils.js'

// Constants for keys
let SNOOZIFY_DATES_KEY = 'snoozify_dates';
let SNOOZIFY_DATE_PREFIX = 'snoozify_';

if (testing) {
  SNOOZIFY_DATES_KEY += '_testing'
  SNOOZIFY_DATE_PREFIX += '_testing'
}

// Function to clear all snoozed pages data
const clearSnoozedPages = () => {
  // Clear all related keys
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys => {
      const keysToDelete = Object.keys(keys).filter(key => key.startsWith(SNOOZIFY_DATE_PREFIX) || key === SNOOZIFY_DATES_KEY);
      chrome.storage.sync.remove(keysToDelete, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        }
        resolve();
      });
    });
  });
};

// Function to get all snoozed pages or snoozed pages for a specific date
const getSnoozedPages = (date = null) => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(SNOOZIFY_DATES_KEY, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      const dates = result[SNOOZIFY_DATES_KEY] || [];
      const keys = date ? [SNOOZIFY_DATE_PREFIX + date] : dates.map(date => SNOOZIFY_DATE_PREFIX + date);

      chrome.storage.sync.get(keys, pagesResult => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        const snoozedPages = [];
        keys.forEach(key => {
          const wakeUpDate = key.replace(SNOOZIFY_DATE_PREFIX, '');
          (pagesResult[key] || []).forEach(page => {
            // Transform the page object to the desired format
            snoozedPages.push({
              title: page.page_title,
              url: page.page_url,
              uid: page.page_hash,
              wakeUpDate: wakeUpDate,
            });
          });
        });

        resolve(snoozedPages);
      });
    });
  });
};

// Function to get the count of snoozed pages for a specific date (ignoring time)
const getSnoozedPageCount = (dateString) => {
  return new Promise((resolve, reject) => {
    let date = new Date(dateString); // convert the dateString to a Date object

    getSnoozedPages()
    .then(snoozedPages => {
        // Filter pages to include only those that match the specified date (ignoring time)
      const matchingPages = snoozedPages.filter(page => {
        const pageDate = new Date(page.wakeUpDate);
        return pageDate.getFullYear() === date.getFullYear()
        && pageDate.getMonth() === date.getMonth()
        && pageDate.getDate() === date.getDate();
      });

      resolve(matchingPages.length);
    })
    .catch(error => reject(error));
  });
};

const importSnoozifiedPages = (importedPages) => {
  return new Promise(async (resolve, reject) => {
    const existingPages = await getSnoozedPages();
    const existingUIDs = new Set(existingPages.map(page => page.uid));

        // Process the imported pages
    importedPages.forEach(page => {
      while (existingUIDs.has(page.uid)) {
        page.uid = getUID();
      }
      existingUIDs.add(page.uid); 
    });

        // Combine existing pages with the imported pages
    const combinedPages = [...existingPages, ...importedPages];

        // Format the combined data for storage
    const datesMap = combinedPages.reduce((acc, page) => {
      const key = SNOOZIFY_DATE_PREFIX + new Date(page.wakeUpDate).toISOString().split('T')[0];
      acc[key] = acc[key] || [];
      acc[key].push({
        page_title: page.title,
        page_url: page.url,
        page_hash: page.uid,
      });
      return acc;
    }, {});

    const dates = Object.keys(datesMap).map(key => key.replace(SNOOZIFY_DATE_PREFIX, ''));
    const queryObject = { [SNOOZIFY_DATES_KEY]: dates, ...datesMap };

        // Store the transformed data back into Chrome storage
    chrome.storage.sync.set(queryObject, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      }
      resolve();
    });
  });
};

// Function to remove a snoozed page by UID
const removePagesByUIDs = uids => {
  return new Promise((resolve, reject) => {
    getSnoozedPages()
    .then(snoozedPages => {
        // Filter out the pages with the specified UIDs
      const updatedPages = snoozedPages.filter(page => !uids.includes(page.uid));

        // Group pages by wakeUpDate
      const datesMap = updatedPages.reduce((acc, page) => {
        const key = SNOOZIFY_DATE_PREFIX + page.wakeUpDate;
        acc[key] = acc[key] || [];
        acc[key].push({
          page_title: page.title,
          page_url: page.url,
          page_hash: page.uid,
        });
        return acc;
      }, {});

      const dates = Object.keys(datesMap).map(key => key.replace(SNOOZIFY_DATE_PREFIX, ''));
      const queryObject = { [SNOOZIFY_DATES_KEY]: dates, ...datesMap };

        // Prepare keys to delete (dates that have no pages left)
      const keysToDelete = snoozedPages
      .map(page => SNOOZIFY_DATE_PREFIX + page.wakeUpDate)
      .filter(key => !datesMap[key]);

        // Set new data and remove empty keys
      chrome.storage.sync.set(queryObject, () => {
        if (chrome.runtime.lastError) {
          console.error('Storage Error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

          // Remove empty date-specific keys
        chrome.storage.sync.remove(keysToDelete, () => {
          if (chrome.runtime.lastError) {
            console.error('Storage Error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }

          resolve();
        });
      });
    })
    .catch(error => {
      console.error('Get Snoozed Pages Error:', error);
      reject(error);
    });
  });
};


// Function to snooze a list of pages
const snoozePages = pages => {
  return new Promise((resolve, reject) => {
    getSnoozedPages()
    .then(existingPages => {
        // Combine existing snoozed pages with new ones
      const combinedPages = existingPages.concat(pages);

        // Group pages by wakeUpDate
      const datesMap = combinedPages.reduce((acc, page) => {
        const key = SNOOZIFY_DATE_PREFIX + page.wakeUpDate;
        acc[key] = acc[key] || [];
        acc[key].push({
          page_title: page.title,
          page_url: page.url,
            page_hash: page.uid, // Using uid instead of id
          });
        return acc;
      }, {});

      const dates = Object.keys(datesMap).map(key => key.replace(SNOOZIFY_DATE_PREFIX, ''));
      const queryObject = { [SNOOZIFY_DATES_KEY]: dates, ...datesMap };

      chrome.storage.sync.set(queryObject, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        }
        resolve();
      });
    })
    .catch(error => reject(error));
  });
};

// background.js
const calculateStorageSize = () => {
  chrome.storage.sync.getBytesInUse(null, (bytes) => {
    console.log(`Total storage used: ${bytes} bytes`);
  });
};

const logSyncStorage = () => {
  chrome.storage.sync.get(null, (items) => {
    console.log('All sync storage items:', items);
  });
};

export default {
  clearSnoozedPages,
  getSnoozedPages,
  getSnoozedPageCount,
  importSnoozifiedPages,
  removePagesByUIDs,
  snoozePages,
  calculateStorageSize,
  logSyncStorage
};
