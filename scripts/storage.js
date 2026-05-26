import { testing } from '/scripts/testing.js'
import { getUID } from '/scripts/utils.js'

let SNOOZIFY_DATES_KEY = 'snoozify_dates';
let SNOOZIFY_DATE_PREFIX = 'snoozify_';

if (testing) {
  SNOOZIFY_DATES_KEY += '_testing'
  SNOOZIFY_DATE_PREFIX += '_testing'
}

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
