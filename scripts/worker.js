import { openPagesDueBy } from '/scripts/snoozer.js'
import { trace } from '/scripts/utils.js'

const alarmName = 'Snoozify scheduler'

chrome.alarms.create(alarmName, {
	delayInMinutes: 0,
	periodInMinutes: 2, // Set longer than a minute period to prevent race conditions when opening browser for the first time
})

chrome.alarms.onAlarm.addListener(alarm => {
	if (alarm.name === alarmName) {
		console.log('Snoozify alarm', alarm)
		openPagesDueBy(new Date())
		.then(launchPageOpenNotification)
	}
})

const launchPageOpenNotification = pagesOpened => {
	if (pagesOpened.length === 0) {
		return
	}

	const plural = pagesOpened.length > 1
	const title = `Snoozify woke up ${plural ? 'pages' : 'a page'}`
	const message = plural ? `${pagesOpened.length} pages` : `${pagesOpened[0].title}.`

	chrome.notifications.create({
		title, message,
		iconUrl: '/assets/icon-128.png',
		type: 'basic',
		silent: true,
	})
}