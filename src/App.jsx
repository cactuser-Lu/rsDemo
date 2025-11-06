import React from "react";
import { useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";
import Drawer from "./pages/Drawer";
import Timer from "./components/DelayCoupon/Timer";
import { AppProvider } from './store/context';
import TodoList from './components/Timer/Todo';
import ReducerDemo from "./components/FlexDemo/ReducerDemo";

function App() {
	const [count, setCount] = useState(0);

	return (
		<div className="App">
			<div>
				<a href="https://reactjs.org" target="_blank" rel="noreferrer">
					<img src={reactLogo} className="logo react" alt="React logo" />
				</a>
			</div>
			<h1>Rspack + React</h1>
			<Timer />
			{/* <AppProvider>
			  <TodoList />
			</AppProvider> */}
			<ReducerDemo/>
			<div className="card">
				<button type="button" onClick={() => setCount(count => count + 1)}>
					count is {count}
				</button>
				<p>
					Edit <code>src/App.jsx</code> and save to test HMR
				</p>
			</div>
			<p className="read-the-docs">
				Click on the Rspack and React logos to learn more
			</p>
		</div>
	);
}

export default App;
