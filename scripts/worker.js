import { openPagesDueBy } from '/scripts/snoozer.js'

const alarmName = 'Snoozify scheduler'

chrome.alarms.create(alarmName, {
	delayInMinutes: 0,
	periodInMinutes: 1,
})

chrome.alarms.onAlarm.addListener(alarm => {
	if (alarm.name === alarmName) {
		console.log('Snoozify alarm', alarm)
		openPagesDueBy(new Date())
		.then(launchPageOpenNotifcation)
	}
})

const launchPageOpenNotifcation = pagesOpened => {
	if (pagesOpened.length === 0) {
		return
	}

	const plural = pagesOpened.length > 1

	const title = `Snoozify woke up ${plural ? 'pages' : 'a page'}`
	const message = plural ? `${pagesOpened.length} pages` : `${pagesOpened[0].title}.`

	chrome.notifications.create({
		title, message,
		iconUrl: '/assets/icon.png',
		type: 'basic',
		silent: true,
	})
}