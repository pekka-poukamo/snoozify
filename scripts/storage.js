import { getUID } from '/scripts/utils.js'

// Storage schema (v2)
// Keys:
//   snoozify_version        — integer, current schema version (CURRENT_SCHEMA_VERSION)
//   snoozify_dates          — string[], list of ISO date strings with snoozed pages
//   snoozify_YYYY-MM-DD     — {page_title, page_url, page_hash}[], pages for that date
//
// Backwards compatibility is a hard requirement: users' snoozed pages must survive
// extension updates. When changing the schema:
//   1. Bump CURRENT_SCHEMA_VERSION
//   2. Add a migration case in runMigrations() in this file (create it if it doesn't exist)
//   3. Call Storage.runMigrations() from worker.js via chrome.runtime.onInstalled
//   4. Add tests for the migration in tests/storage.migration.test.js
//   5. Update this comment and the README

const SNOOZIFY_VERSION_KEY = 'snoozify_version'  // eslint-disable-line no-unused-vars
const CURRENT_SCHEMA_VERSION = 2  // eslint-disable-line no-unused-vars

const SNOOZIFY_DATES_KEY = 'snoozify_dates';
const SNOOZIFY_DATE_PREFIX = 'snoozify_';

const toStorageDate = wakeUpDate => new Date(wakeUpDate).toISOString().split('T')[0];

const pagesToStorageObject = pages => {
  const datesMap = pages.reduce((acc, page) => {
    const key = SNOOZIFY_DATE_PREFIX + toStorageDate(page.wakeUpDate);
    acc[key] = acc[key] || [];
    acc[key].push({ page_title: page.title, page_url: page.url, page_hash: page.uid });
    return acc;
  }, {});
  const dates = Object.keys(datesMap).map(key => key.replace(SNOOZIFY_DATE_PREFIX, ''));
  return { [SNOOZIFY_DATES_KEY]: dates, ...datesMap };
};

const clearSnoozedPages = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys => {
      const keysToDelete = Object.keys(keys).filter(key => (key.startsWith(SNOOZIFY_DATE_PREFIX) || key === SNOOZIFY_DATES_KEY) && key !== SNOOZIFY_VERSION_KEY);
      chrome.storage.sync.remove(keysToDelete, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        }
        resolve();
      });
    });
  });
};

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

const getSnoozedPageCount = dateString =>
  getSnoozedPages(toStorageDate(dateString))
    .then(pages => pages.length);

const importSnoozifiedPages = async (importedPages) => {
  const existingPages = await getSnoozedPages();
  const existingUIDs = new Set(existingPages.map(page => page.uid));

  importedPages.forEach(page => {
    while (existingUIDs.has(page.uid)) {
      page.uid = getUID();
    }
    existingUIDs.add(page.uid);
  });

  const queryObject = pagesToStorageObject([...existingPages, ...importedPages]);

  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(queryObject, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
};

const removePagesByUIDs = uids => {
  return new Promise((resolve, reject) => {
    getSnoozedPages()
    .then(snoozedPages => {
      const updatedPages = snoozedPages.filter(page => !uids.includes(page.uid));
      const queryObject = pagesToStorageObject(updatedPages);

      const keysToDelete = snoozedPages
        .map(page => SNOOZIFY_DATE_PREFIX + toStorageDate(page.wakeUpDate))
        .filter(key => !queryObject[key]);

      chrome.storage.sync.set(queryObject, () => {
        if (chrome.runtime.lastError) {
          console.error('Storage Error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

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

const snoozePages = pages => {
  return new Promise((resolve, reject) => {
    getSnoozedPages()
    .then(existingPages => {
      const queryObject = pagesToStorageObject(existingPages.concat(pages));

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
