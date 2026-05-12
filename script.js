const STORAGE_KEY = "task-manager:v1";

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const taskCounts = document.getElementById("taskCounts");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");

const taskElements = new Map();

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && typeof item.id === "string" && typeof item.text === "string")
      .map((item) => ({
        id: item.id,
        text: item.text.trim(),
        completed: Boolean(item.completed)
      }))
      .filter((item) => item.text.length > 0);
  } catch (error) {
    console.error("Failed to load tasks from storage.", error);
    return [];
  }
}

function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Failed to save tasks to storage.", error);
  }
}

let state = {
  tasks: loadTasks()
};

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setState(updater) {
  const nextState = updater(state);
  if (!nextState || nextState === state) {
    return;
  }

  state = nextState;
  saveTasks(state.tasks);
  render();
}

function addTask(text) {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return;
  }

  const task = {
    id: createId(),
    text: cleaned,
    completed: false
  };

  setState((prev) => ({
    ...prev,
    tasks: [...prev.tasks, task]
  }));
}

function toggleTask(taskId) {
  setState((prev) => {
    let changed = false;
    const nextTasks = prev.tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      changed = true;
      return {
        ...task,
        completed: !task.completed
      };
    });

    return changed ? { ...prev, tasks: nextTasks } : prev;
  });
}

function deleteTask(taskId) {
  setState((prev) => {
    const nextTasks = prev.tasks.filter((task) => task.id !== taskId);
    return nextTasks.length === prev.tasks.length ? prev : { ...prev, tasks: nextTasks };
  });
}

function clearCompleted() {
  setState((prev) => {
    const nextTasks = prev.tasks.filter((task) => !task.completed);
    return nextTasks.length === prev.tasks.length ? prev : { ...prev, tasks: nextTasks };
  });
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = "task-item";
  item.dataset.taskId = task.id;

  const taskMain = document.createElement("label");
  taskMain.className = "task-main";

  const toggle = document.createElement("input");
  toggle.className = "task-toggle";
  toggle.type = "checkbox";
  toggle.dataset.action = "toggle";

  const text = document.createElement("span");
  text.className = "task-text";

  taskMain.append(toggle, text);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "task-delete";
  removeButton.dataset.action = "delete";
  removeButton.textContent = "Delete";

  item.append(taskMain, removeButton);

  item._toggle = toggle;
  item._text = text;
  item._removeButton = removeButton;

  syncTaskElement(item, task);
  return item;
}

function syncTaskElement(item, task) {
  item.classList.toggle("is-complete", task.completed);
  item._toggle.checked = task.completed;
  item._toggle.setAttribute(
    "aria-label",
    task.completed ? `Mark ${task.text} as incomplete` : `Mark ${task.text} as complete`
  );
  item._text.textContent = task.text;
  item._removeButton.setAttribute("aria-label", `Delete ${task.text}`);
}

function renderList() {
  const fragment = document.createDocumentFragment();
  const seenIds = new Set();

  for (const task of state.tasks) {
    let item = taskElements.get(task.id);
    if (!item) {
      item = createTaskElement(task);
      taskElements.set(task.id, item);
    } else {
      syncTaskElement(item, task);
    }

    fragment.append(item);
    seenIds.add(task.id);
  }

  for (const [taskId, item] of taskElements) {
    if (seenIds.has(taskId)) {
      continue;
    }

    item.remove();
    taskElements.delete(taskId);
  }

  taskList.replaceChildren(fragment);
  emptyState.hidden = state.tasks.length > 0;
}

function renderSummary() {
  const total = state.tasks.length;
  const completed = state.tasks.reduce((count, task) => count + Number(task.completed), 0);
  const remaining = total - completed;

  taskCounts.textContent = `${total} total | ${completed} completed | ${remaining} remaining`;
  clearCompletedBtn.disabled = completed === 0;
}

function render() {
  renderList();
  renderSummary();
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(taskInput.value);
  taskForm.reset();
  taskInput.focus();
});

taskList.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.dataset.action !== "toggle") {
    return;
  }

  const taskItem = target.closest(".task-item");
  if (!taskItem) {
    return;
  }

  toggleTask(taskItem.dataset.taskId);
});

taskList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const removeButton = target.closest("[data-action='delete']");
  if (!removeButton) {
    return;
  }

  const taskItem = removeButton.closest(".task-item");
  if (!taskItem) {
    return;
  }

  deleteTask(taskItem.dataset.taskId);
});

clearCompletedBtn.addEventListener("click", clearCompleted);

render();
