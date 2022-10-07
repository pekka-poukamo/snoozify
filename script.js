console.log('success!')

const WEEKDAYS = {
	'MON': 1,
	'TUE': 2,
	'WED': 3,
	'THU': 4,
	'FRI': 5,
	'SAT': 6,
	'SUN': 0,
}

const getNextWeekdayFromDate = (date, weekday) => {
	const currentWeekday = date.getDay(); // 0 (Sun) - 6 (sat)
	let daysToAdvance = (weekday - currentWeekday)

	if (daysToAdvance <= 0) {
		daysToAdvance = daysToAdvance + 7
	}

	const newDate = new Date()
	newDate.setUTCDate(date.getUTCDate() + daysToAdvance)

	return newDate;
}

const getNextWeekdaysFromToday = () => Object.keys(WEEKDAYS).map(weekday => getNextWeekdayFromDate(new Date(), WEEKDAYS[weekday]))

document.addEventListener("DOMContentLoaded", () => {
	getNextWeekdaysFromToday().map(weekday => {
		const button = document.querySelector('#datebutton').content.cloneNode(true)
		const weekDayFormatOptions = {weekday: 'long'}
		const dateFormatOptions = {day: 'numeric', month: 'short'}

		button.querySelector('.datebutton__weekday').textContent = new Intl.DateTimeFormat('en-US', weekDayFormatOptions).format(weekday)
		button.querySelector('.datebutton__date').textContent =  new Intl.DateTimeFormat('en-US', dateFormatOptions).format(weekday)
		button.children[0].setAttribute('value', weekday.toISOString())

		return button
	}).forEach(button => {
		document.querySelector('#buttons').appendChild(button)
	})
})
