export function makeTodayFormat() {
	const date = new Date();
	const yearFormat = new Intl.DateTimeFormat("pt-PT", { year: "numeric" }).format(date);
	const monthFormat = new Intl.DateTimeFormat("pt-PT", { month: "long" }).format(date);
	const dayFormat = new Intl.DateTimeFormat("pt-PT", { day: "2-digit" }).format(date);
	const hour = new Intl.DateTimeFormat("pt-PT", { timeStyle: "medium" }).format(date);
	return `${
		monthFormat.charAt(0).toUpperCase() +
		monthFormat.slice(1)
	} ${dayFormat}, ${yearFormat} - ${hour}`;
}
