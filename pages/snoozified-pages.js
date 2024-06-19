import Storage from '/scripts/storage.js'
import { byDate } from '/scripts/utils.js'
import { openPageById } from '/scripts/snoozer.js'

const initializeHistory = () => {
	Storage.getSnoozedPages()
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
			.filter(page => page.openedDate === undefined)
			.map(getPageElement)
			.forEach(pageLink => pagesElement.appendChild(pageLink))

			if (new Date(unformattedDate).getDay() === 1 && index !== 0) {
				dateGroup.querySelector('h2').classList.add('date-group--monday')
			}

			pageLinksElement.appendChild(dateGroup)
		})
	})
}

const getPageElement = page => {
	const pageLink = document.querySelector('#page-link-template').content.cloneNode(true);
	const dateFormatOptions = {weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: false};

	const linkElement = pageLink.querySelector('.page-link__url');
	linkElement.href = page.url;
	linkElement.textContent = page.title;

	pageLink.querySelector('.page-link__wakeupdate').textContent = new Intl.DateTimeFormat('en-US', dateFormatOptions).format(new Date(page.wakeUpDate));
	pageLink.querySelector('.page-link__wakeup-button').addEventListener('click', getWakeupButtonFunction(page.uid));
	return pageLink;
};

const getWakeupButtonFunction = uid => async () => {
	openPageById(uid);
};

/* Run the extension */

const isValidSnoozifiedPage = page => {
	// You can expand this based on the properties you expect
	return page &&
	typeof page.title === 'string' &&
	typeof page.url === 'string' &&
	typeof page.uid === 'string' &&
	typeof page.wakeUpDate === 'string';  // assuming wakeUpDate is a string in ISO format
};

const validateImportedData = data => {
	if (!Array.isArray(data)) {
		return false;
	}
	return data.every(isValidSnoozifiedPage);
};


document.addEventListener("DOMContentLoaded", () => {
	initializeHistory()

	Storage.calculateStorageSize()

	document.querySelector('#clear-button').addEventListener('click', () => {
		Storage.clearSnoozedPages()
		initializeHistory()
	})

	document.querySelector('#export-button').addEventListener('click', () => {
		Storage.getSnoozedPages().then(snoozedPages => {
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

					Storage.importSnoozifiedPages(importedData).then(() => {
						initializeHistory(); // Reload the history
					});
				} catch (error) {
					console.error("Error parsing JSON", error);
				}
			};
			reader.readAsText(file);
		}
	});
})
