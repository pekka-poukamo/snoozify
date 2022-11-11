const clearSnoozedPages = () => chrome.storage.sync.set({'snoozedPages': []})

const getSnoozedPages = () => {
	return new Promise((resolve, reject) => {
		try {
			chrome.storage.sync.get({'snoozedPages': []}, result => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				}

				resolve(result.snoozedPages)
			})
		} catch (error) {
			reject(error)
		}
		
	})
	
}

const setSnoozedPages = snoozedPages => {
	return new Promise((resolve, reject) => {
		try {
			chrome.storage.sync.set({'snoozedPages': snoozedPages}, result => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError)
				}

				resolve(result)
			})
		} catch (error) {
			reject(error)
		}
	})
}

const setPageValue = (id, field, value) => {
	return getSnoozedPages().then(snoozedPages => {
		const page = snoozedPages.find(page => page.id === id);
		page[field] = value

		return setSnoozedPages(snoozedPages)
	})
}

export default {
	clearSnoozedPages,
	getSnoozedPages,
	setSnoozedPages,
	setPageValue,
}