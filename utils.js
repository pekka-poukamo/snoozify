const WEEKDAYS = {
	'MON': 1,
	'TUE': 2,
	'WED': 3,
	'THU': 4,
	'FRI': 5,
	'SAT': 6,
	'SUN': 0,
}

export const byDate = (page1, page2) => new Date(page1.wakeUpDate) - new Date(page2.wakeUpDate)

// getUID function from https://dev.to/rahmanfadhil/how-to-generate-unique-id-in-javascript-1b13#comment-1ol48
export const getUID = () => String(
	Date.now().toString(32) + Math.random().toString(16)
	).replace(/\./g, '')


export const trace = string => object => {
	console.log(string, object)
	return object
}

export const getNextWeekdayFromDate = (date, weekday) => {
	const currentWeekday = date.getDay(); // 0 (Sun) - 6 (sat)
	let daysToAdvance = (weekday - currentWeekday)

	if (daysToAdvance <= 0) {
		daysToAdvance = daysToAdvance + 7
	}

	const newDate = new Date()
	newDate.setUTCDate(date.getUTCDate() + daysToAdvance)

	return newDate;
}

export const getNextWeekdaysFromToday = () => Object.keys(WEEKDAYS).map(weekday => getNextWeekdayFromDate(new Date(), WEEKDAYS[weekday]))

export default {
	byDate,
	getUID,
	trace,
	getNextWeekdayFromDate,
	getNextWeekdaysFromToday,
}