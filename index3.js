//Fetch Implementation
//GET
function myFetch(url, options = {}) {
	return new Promise((res, rej) => {
		let xhr = new XMLHttpRequest();
		xhr.open(options.method || "GET", url);
		xhr.responseType = "json";
		for (let header in options.headers) {
			xhr.setRequestHeader(header, options.headers[header]);
		}
		xhr.onload = () => {
			res(xhr.response);
		};
		xhr.onerror = () => {
			rej(new Error("An error occurred"));
		};
		xhr.send(options.body);
	});
}

//POST

//APIs
const APIs = (() => {
	const url = "http://localhost:3000/todos";

	//Create todo items
	const createTodo = (newTodo) => {
		return myFetch(url, {
			method: "POST",
			body: JSON.stringify(newTodo),
			headers: { "Content-Type": "application/json" },
		});
	};

	//Delete todo items
	const deleteTodo = (id) => {
		return myFetch(`${url}/${id}`, {
			method: "DELETE",
		});
	};

	//Read data to initialize
	const getTodos = () => {
		return myFetch(url);
	};

	//Edit data
	const editTodo = (id, todo) => {
		return myFetch(`${url}/${id}`, {
			method: "PATCH",
			body: JSON.stringify(todo),
			headers: { "Content-Type": "application/json" },
		});
	};

	return { createTodo, deleteTodo, getTodos, editTodo };
})();

//-- Model --
//manage data
const Model = (() => {
	class State {
		#todos; //data array
		#onChange; //function, will be called when setter function is called
		//used to render DOM on change in data
		constructor() {
			this.#todos = [];
		}
		get todos() {
			//Read todo data
			return this.#todos;
		}
		set todos(newTodos) {
			//Write todo data
			this.#todos = newTodos;
			this.#onChange?.();
			//shorter syntax for & operator, call if its not undefined
			//this.#onChange !== undefined && this.#onChange
			//if we update the state, we want to update the DOM
		}

		subscribe(callback) {
			//subscribe to the change of the state
			this.#onChange = callback; //let the controller decide what to function it is
		}
	}

	//the methods fetching data from API can also be part of model
	const { createTodo, deleteTodo, getTodos, editTodo } = APIs;

	return {
		State,
		createTodo,
		deleteTodo,
		getTodos,
		editTodo,
	};
})();
/* 
    todos = [
        {
            id:1,
            isCompleted: false,
            content:"eat lunch"
        },
        {
            id:2,
            isCompleted: false,
            content:"eat breakfast"
        }
    ]
*/

//-- View --
//manage DOM
const View = (() => {
	const todolistEl = document.querySelector(".todo-list");
	const submitBtnEl = document.querySelector(".submit-btn");
	const inputEl = document.querySelector(".input");
	const completeTodolistEl = document.querySelector(".completed-tasks");

	//rendering todos based on the state todo data
	const renderTodos = (todos) => {
		let todoTemplate = "";
		let completeTemplate = "";

		const todoArr = todos.filter((todo) => {
			return !todo.isCompleted;
		});

		console.log(todoArr);

		const todoCompletedArr = todos.filter((todo) => {
			return todo.isCompleted;
		});
		console.log(todoCompletedArr);

		todoArr.forEach((todo) => {
			const temp1 = `<li class="todo"><input class="edit-input ${todo.id}" value="${todo.content}" readonly />
			<button class="edit-btn ${todo.id}" >Edit</button>
			<button class="complete-btn ${todo.id}" >Complete</button>
			<button class="delete-btn ${todo.id}">Delete</button></li>`;

			todoTemplate += temp1;
		});

		todoCompletedArr.forEach((todo) => {
			const temp2 = `<li class="todo"><input class="edit-input ${todo.id}" value="${todo.content}" readonly />
			<button class="complete-btn ${todo.id}" >Resume Task</button>
			<button class="delete-btn ${todo.id}">Delete</button></li>`;

			completeTemplate += temp2;
		});

		if (todoArr.length === 0) {
			todoTemplate = "<h4>No pending task to display</h4>";
		}
		if (todoCompletedArr.length === 0) {
			completeTemplate = "<h4>No completed task to display</h4>";
		}

		todolistEl.innerHTML = todoTemplate;
		completeTodolistEl.innerHTML = completeTemplate;
	};

	const clearInput = () => {
		inputEl.value = "";
	};

	const focusInput = () => {
		inputEl.focus();
	};

	return {
		renderTodos,
		todolistEl,
		completeTodolistEl,
		submitBtnEl,
		inputEl,
		clearInput,
		focusInput,
	};
})();

//-- Controller --
//interaction between view and model, logics, handle events
const Controller = ((view, model) => {
	const state = new model.State();

	//initiallization fetch data from db to state
	const init = () => {
		//read the todos data from db using getTodos in Model
		model.getTodos().then((todos) => {
			todos.reverse(); //decending order so the newly added task in on top
			state.todos = todos; //setter function to set data to state
		});
	};

	const handleSubmit = () => {
		view.submitBtnEl.addEventListener("click", (e) => {
			//read input value -> post request update db -> render DOM
			//(just update state, the state will #onchange -> subscribe -> renderTodos)
			const inputValue = view.inputEl.value;
			model
				.createTodo({
					content: inputValue,
					isCompleted: false,
				})
				.then((data) => {
					//to call setter, you cannot mutate the state array
					state.todos = [data, ...state.todos];
					view.clearInput(); //only clear input after previous request succeeded
					view.focusInput();
				});
		});
	};

	const handleDelete = () => {
		view.todolistEl.addEventListener("click", (e) => {
			if (e.target.classList.contains("delete-btn")) {
				const id = e.target.classList[1];
				model.deleteTodo(+id).then((data) => {
					state.todos = state.todos.filter((todo) => todo.id !== +id);
				});
			}
		});

		view.completeTodolistEl.addEventListener("click", (e) => {
			if (e.target.classList.contains("delete-btn")) {
				const id = e.target.classList[1];
				model.deleteTodo(+id).then((data) => {
					state.todos = state.todos.filter((todo) => todo.id !== +id);
				});
			}
		});
	};

	const handleEdit = () => {
		view.todolistEl.addEventListener("click", (e) => {
			if (e.target.classList.contains("edit-btn")) {
				const id = e.target.classList[1];
				const inputEl = e.target.parentElement.firstChild;

				if (inputEl.hasAttribute("readonly")) {
					inputEl.removeAttribute("readonly");
					inputEl.focus();
					e.target.innerHTML = "Save";
				} else {
					model
						.editTodo(+id, {
							content: inputEl.value,
						})
						.then((data) => {
							inputEl.setAttribute("readonly", "readonly");
							e.target.innerHTML = "Edit";
						});
				}
			}
		});
		view.completeTodolistEl.addEventListener("click", (e) => {
			if (e.target.classList.contains("edit-btn")) {
				const id = e.target.classList[1];
				const inputEl = e.target.parentElement.firstChild;

				if (inputEl.hasAttribute("readonly")) {
					inputEl.removeAttribute("readonly");
					inputEl.focus();
					e.target.innerHTML = "Save";
				} else {
					model
						.editTodo(+id, {
							content: inputEl.value,
						})
						.then((data) => {
							inputEl.setAttribute("readonly");
							e.target.innerHTML = "Edit";
						});
				}
			}
		});
	};

	const handleComplete = () => {

		view.todolistEl.addEventListener("click", (e) => {
			if (e.target.classList.contains("complete-btn")) {
				const id = e.target.classList[1];

					model.editTodo(+id, { isCompleted: true }).then((data) => {
						state.todos.forEach((todo) => {
							if (todo.id === +id) {
								todo.isCompleted = !todo.isCompleted;
							}
						});
            e.target.classList.add("completed");
						state.todos = [...state.todos];
					});
        }
		});

		view.completeTodolistEl.addEventListener("click", (e) => {
			if (e.target.classList.contains("complete-btn")) {
				const id = e.target.classList[1];

					model.editTodo(+id, { isCompleted: false }).then((data) => {
						state.todos.forEach((todo) => {
							if (todo.id === +id) {
								todo.isCompleted = !todo.isCompleted;
							}
						});
            e.target.classList.remove("completed");
						state.todos = [...state.todos];
					});
      }
		});
  }

	const bootstrap = () => {
		init();
		handleSubmit();
		handleDelete();
		handleEdit();
		handleComplete();
		state.subscribe(() => {
			view.renderTodos(state.todos); //use renderTodos function from view
		}); //and data from Model state.todos(getter)
	};

	return { bootstrap };
})(View, Model);

Controller.bootstrap();
