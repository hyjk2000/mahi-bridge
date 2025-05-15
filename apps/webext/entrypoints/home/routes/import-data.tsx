import type { MetaFunction } from "react-router";

function ImportData() {
	return <p>Import Data</p>;
}

const meta: MetaFunction = () => [
	{
		title: "Import Data | Mahi Bridge",
	},
];

export { ImportData as Component, meta };
