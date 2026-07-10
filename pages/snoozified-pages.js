import SnoozeStore from '/scripts/snooze-store.js'
import { byDate } from '/scripts/utils.js'
import { openPageById } from '/scripts/snoozer.js'

const SYNC_QUOTA_BYTES = 102400
const LOCAL_QUOTA_BYTES = 10485760
const QUOTA_WARNING_RATIO = 0.8

let activeTab = 'scheduled'
let unsubscribeOnChanged = null

const renderScheduledQueue = () => {
	SnoozeStore.exportScheduled()
	.then(snoozedPages => {
		const pageLinksElement = document.querySelector('#page-links')
		pageLinksElement.innerHTML = ''

		if (snoozedPages.length === 0) {
			pageLinksElement.innerHTML = 'No snoozed pages yet.'
		}

		const sortedPages = snoozedPages.sort(byDate)
		const groupedPages = sortedPages.reduce((groups, page) => {
			const date = new Date(page.wakeUpDate).toISOString().split('T')[0]
			if (!groups[date]) {
				groups[date] = []
			}
			groups[date].push(page)
			return groups
		}, {})

		Object.entries(groupedPages)
		.forEach(([unformattedDate, pages], index) => {
			const formattedDate = new Date(unformattedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
			const dateGroup = document.querySelector('#date-group-template').content.cloneNode(true)
			dateGroup.querySelector('.date-group__date-text').textContent = formattedDate
			dateGroup.querySelector('.date-group__count').textContent = `${pages.length}`
			const pagesElement = dateGroup.querySelector('.date-group__pages')
			pages
			.map(getPageElement)
			.forEach(pageLink => pagesElement.appendChild(pageLink))

			if (new Date(unformattedDate).getDay() === 1 && index !== 0) {
				dateGroup.querySelector('h2').classList.add('date-group--monday')
			}

			pageLinksElement.appendChild(dateGroup)
		})
	})
}

const renderHistory = () => {
	SnoozeStore.getHistory({ limit: 100 })
	.then(events => {
		const historyElement = document.querySelector('#history-list')
		historyElement.innerHTML = ''

		if (events.length === 0) {
			historyElement.textContent = 'No wake history yet.'
			return
		}

		events.forEach(event => {
			const entry = document.createElement('article')
			entry.className = 'history-entry'

			const meta = document.createElement('div')
			meta.className = 'history-entry__meta'
			const at = new Date(event.at).toLocaleString('en-US', {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				hour12: false,
			})
			meta.textContent = `${at} · ${event.reason}`
			entry.appendChild(meta)

			const list = document.createElement('ul')
			list.className = 'history-entry__pages'
			event.pages.forEach(page => {
				const item = document.createElement('li')
				const link = document.createElement('a')
				link.href = page.url
				link.textContent = page.title
				link.target = '_blank'
				item.appendChild(link)
				list.appendChild(item)
			})
			entry.appendChild(list)
			historyElement.appendChild(entry)
		})
	})
}

const renderActiveTab = () => {
	if (activeTab === 'scheduled') {
		renderScheduledQueue()
	} else {
		renderHistory()
	}
}

const setActiveTab = tab => {
	activeTab = tab
	const scheduledPanel = document.querySelector('#scheduled-panel')
	const historyPanel = document.querySelector('#history-panel')
	const scheduledTab = document.querySelector('#tab-scheduled')
	const historyTab = document.querySelector('#tab-history')

	const isScheduled = tab === 'scheduled'
	scheduledPanel.hidden = !isScheduled
	historyPanel.hidden = isScheduled
	scheduledTab.classList.toggle('tab--active', isScheduled)
	historyTab.classList.toggle('tab--active', !isScheduled)
	scheduledTab.setAttribute('aria-selected', String(isScheduled))
	historyTab.setAttribute('aria-selected', String(!isScheduled))

	renderActiveTab()
}

const getBytesInUse = area => new Promise(resolve => {
	chrome.storage[area].getBytesInUse(null, bytes => resolve(bytes))
})

const updateQuotaWarning = async () => {
	const warningElement = document.querySelector('#quota-warning')
	const [syncBytes, localBytes] = await Promise.all([
		getBytesInUse('sync'),
		getBytesInUse('local'),
	])

	const warnings = []
	if (syncBytes >= SYNC_QUOTA_BYTES * QUOTA_WARNING_RATIO) {
		warnings.push(`Sync storage is ${Math.round(syncBytes / 1024)} KB of ~100 KB`)
	}
	if (localBytes >= LOCAL_QUOTA_BYTES * QUOTA_WARNING_RATIO) {
		warnings.push(`Local history is ${Math.round(localBytes / 1024)} KB of ~10 MB`)
	}

	if (warnings.length === 0) {
		warningElement.hidden = true
		warningElement.textContent = ''
		return
	}

	warningElement.textContent = `${warnings.join('. ')}. Consider exporting and clearing old entries.`
	warningElement.hidden = false
}

const getPageElement = page => {
	const pageLink = document.querySelector('#page-link-template').content.cloneNode(true);
	const dateFormatOptions = {weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: false};

	const linkElement = pageLink.querySelector('.page-link__url');
	linkElement.href = page.url;
	linkElement.textContent = page.title;

	pageLink.querySelector('.page-link__wakeupdate').textContent = new Intl.DateTimeFormat('en-US', dateFormatOptions).format(new Date(page.wakeUpDate));
	pageLink.querySelector('.page-link__wakeup-button').addEventListener('click', () => openPageById(page.uid));
	return pageLink;
};

const isValidSnoozifiedPage = page => {
	return page &&
	typeof page.title === 'string' &&
	typeof page.url === 'string' &&
	typeof page.uid === 'string' &&
	typeof page.wakeUpDate === 'string';
};

const validateImportedData = data => {
	if (!Array.isArray(data)) {
		return false;
	}
	return data.every(isValidSnoozifiedPage);
};


document.addEventListener("DOMContentLoaded", () => {
	renderScheduledQueue()
	updateQuotaWarning()

	unsubscribeOnChanged = SnoozeStore.onChanged(() => {
		renderActiveTab()
		updateQuotaWarning()
	})

	document.querySelector('#tab-scheduled').addEventListener('click', () => setActiveTab('scheduled'))
	document.querySelector('#tab-history').addEventListener('click', () => setActiveTab('history'))

	document.querySelector('#clear-button').addEventListener('click', () => {
		SnoozeStore.clearAll().then(renderScheduledQueue)
	})

	document.querySelector('#export-button').addEventListener('click', () => {
		SnoozeStore.exportScheduled().then(snoozedPages => {
			const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snoozedPages));
			const downloadAnchorNode = document.createElement('a');
			downloadAnchorNode.setAttribute("href", dataStr);
			downloadAnchorNode.setAttribute("download", "snoozified_pages_export.json");
			document.body.appendChild(downloadAnchorNode); 
			downloadAnchorNode.click();
			downloadAnchorNode.remove();
		});
	});

	document.querySelector('#import-button').addEventListener('click', () => {
		document.querySelector('#import-file-input').click();
	});

	document.querySelector('#import-file-input').addEventListener('change', event => {
		const file = event.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = function(e) {
				try {
					const importedData = JSON.parse(e.target.result);

					if (!validateImportedData(importedData)) {
						console.error("Invalid data structure");
						return;
					}

					SnoozeStore.importSnoozes(importedData).then(() => {
						renderScheduledQueue();
					});
				} catch (error) {
					console.error("Error parsing JSON", error);
				}
			};
			reader.readAsText(file);
		}
	});
})

window.addEventListener('pagehide', () => {
	if (unsubscribeOnChanged) {
		unsubscribeOnChanged()
	}
})
