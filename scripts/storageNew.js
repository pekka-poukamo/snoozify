import { testing } from '/scripts/testing.js'

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


// Function to snooze a list of pages
const snoozePages = pages => {
  return new Promise((resolve, reject) => {
    // Group pages by wakeUpDate
    const datesMap = pages.reduce((acc, page) => {
      const key = SNOOZIFY_DATE_PREFIX + page.wakeUpDate;
      acc[key] = acc[key] || [];
      acc[key].push({
        page_title: page.title,
        page_url: page.url,
        page_hash: page.id,
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
  });
};

export default {
  clearSnoozedPages,
  getSnoozedPages,
  removePagesByUIDs,
  snoozePages,
};
