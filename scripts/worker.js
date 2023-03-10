import { openPagesDueBy } from '/scripts/snoozer.js'
import { trace } from '/scripts/utils.js'

const alarmName = 'Snoozify scheduler'

let pageLaunchInProgress = false

chrome.alarms.create(alarmName, {
	delayInMinutes: 0,
	periodInMinutes: 1,
})

chrome.alarms.onAlarm.addListener(alarm => {
if (alarm.name === alarmName && !pageLaunchInProgress) {
		console.log('Snoozify alarm', alarm)
		pageLaunchInProgress = true;
		openPagesDueBy(new Date())
		.then(pagesOpened => {
			launchPageOpenNotification(pagesOpened)
			pageLaunchInProgress = false
		})
		.catch(error => {
			pageLaunchInProgress = false
			return Promise.reject(error)
		})
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