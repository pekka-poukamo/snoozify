import { snoozePages } from '/scripts/snoozer.js'
import Storage from '/scripts/storage.js'
import {
	getUID,
	trace,
	getNextWeekdayFromDate,
	getNextWeekdaysFromToday,
} from '/scripts//utils.js'


const initializeWeekDayButtons = () => {
	const buttonContainer = document.querySelector('#buttons')
	buttonContainer.innerHTML = ''

	getNextWeekdaysFromToday()
	.map(getSnoozeButton(document.querySelector('#datebutton').content))
	.forEach(button => buttonContainer.appendChild(button))
}

const getSnoozeButton = buttonTemplate => weekday => {
	const weekDayFormatOptions = {weekday: 'long'}
	const dateFormatOptions = {day: 'numeric', month: 'short'}

	const button = buttonTemplate.cloneNode(true)

	button.querySelector('.datebutton__weekday').textContent = new Intl.DateTimeFormat('en-US', weekDayFormatOptions).format(weekday)
	button.querySelector('.datebutton__date').textContent = new Intl.DateTimeFormat('en-US', dateFormatOptions).format(weekday)
	button.children[0].setAttribute('value', weekday.toISOString())

	return button
}

const getSnoozeButtonFunction = date => async () => {
	date.setHours(8, 0, 0, 0)

	const tabs = await chrome.tabs.query({highlighted: true, currentWindow: true})
	const pages = tabs.map(tab => ({
		title: tab.title,
		url: tab.url,
		wakeUpDate: date,
	}))
	
	snoozePages(pages)
	chrome.tabs.remove(tabs.map(tab => tab.id))
}

document.addEventListener("DOMContentLoaded", () => {
	initializeWeekDayButtons()
	Array.from(document.querySelector('#buttons').children).forEach(child => child.addEventListener('click', getSnoozeButtonFunction(new Date(child.value))))
})