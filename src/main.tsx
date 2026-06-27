import { App } from "@ui/App.tsx";
import { render } from "solid-js/web";
import "./styles/global.css";

const root = document.getElementById("app");
if (!root) {
  throw new Error("Missing #app mount node");
}

render(() => <App />, root);
