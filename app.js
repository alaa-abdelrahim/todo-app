let tasks = [];
let count = 0;
let db, openDB = indexedDB.open("todo", 1);
openDB.onsuccess = function () {
    db = openDB.result;
    createAllTasks();
};

openDB.onupgradeneeded = function (e) {
    let db = openDB.result;
    let tasksObjectStore;
    if (!db.objectStoreNames.contains('tasks')) {
        tasksObjectStore = db.createObjectStore('tasks', { keyPath: 'id' });
    }
    tasksObjectStore.createIndex("status", "status", { unique: false });
};

/* -----------------------------
----------- dark mode ----------
----------------------------- */

let darkSwitcher = document.querySelector('#dark-mode');

// get user preferable mode
if (localStorage.getItem('mode') === 'dark') {
    darkSwitcher.checked = true;
    document.body.classList.add('dark-mode');
}

// event listner
darkSwitcher.addEventListener('change', function (e) {
    if (e.target.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('mode', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.removeItem('mode');
    }
})

/* -----------------------------
--------- add new task ---------
----------------------------- */

let addForm = document.querySelector('#add-details');
addForm.addEventListener('submit', e => {
    // prevent page refresh
    e.preventDefault();
    // check if the input not empty
    if (addForm.add.value && (addForm.add.value).trim()) {
        // create new object with task details
        let newTask = {
            id: count,
            value: addForm.add.value,
            status: 'active'
        }
        // append task to the tasks array
        tasks.push(newTask);
        // create task div on the dom
        let display = '';
        if (document.querySelector('.active-tab').id == 'completed') {
            display = 'd-none';
        }
        createNewTaskInDom(newTask, display);
        // empty the form input
        addForm.add.value = '';
        // increase count
        count++;
        // store data
        let tasksStore = openTransaction('readwrite');
        let addRequest = tasksStore.add(newTask);
    } else {
        alert('Please, Enter a valid task');
    }
});

// create task div on the dom
function createNewTaskInDom(newTask, display) {
    let check = newTask.status === 'active' ? '' : "checked";
    let lineThroughClass = check ? 'line-through' : '';
    let html = `<div id="task_${newTask.id}" data-status= "${newTask.status}" class="${display} custom-control custom-checkbox my-1 mr-sm-2 position-relative">
                    <input onchange="checkboxHandler(event)" type="checkbox" ${check} class="custom-control-input" id="check_${newTask.id}">
                    <label class="custom-control-label ${lineThroughClass}" for="check_${newTask.id}">${newTask.value}</label>
                    <span onclick="deleteTask(event)" class="material-icons position-absolute d-none">delete</span>
                </div>`
    document.querySelector('#display').innerHTML += html;
}

// function to handle checkbox change
function checkboxHandler(e) {
    let status = e.target.checked ? 'completed' : 'active';

    // change the UI
    if (e.target.checked) {
        e.target.nextElementSibling.classList.add('line-through');
        if (document.querySelector('.active-tab').id == 'active') {
            e.target.parentElement.classList.add('d-none');
        }
    } else {
        e.target.nextElementSibling.classList.remove('line-through');
        if (document.querySelector('.active-tab').id == 'completed') {
            e.target.parentElement.classList.add('d-none');
        }
    }
    e.target.parentElement.setAttribute('data-status', status);

    // change the status in tasks array
    let index = (e.target.parentElement.id).split('_')[1];
    let taskObj = tasks.filter(task => task.id == index)[0];
    taskObj.status = status;
    let tasksStore = openTransaction('readwrite');
    let putRequest = tasksStore.put(taskObj);
}

// function to delete specific task
function deleteTask(e) {
    let div = e.target.parentElement
    if (e.target.tagName === 'path') {
        div = e.target.parentElement.parentElement;
    }
    let index = (div.id).split('_')[1];
    tasks = tasks.filter(obj => obj.id != index);
    let tasksStore = openTransaction('readwrite');
    let deleteObj = tasksStore.delete(parseInt(index));
    deleteObj.onsuccess = e => {
        div.remove();
    }
}

// delete all completed tasks
document.querySelector('#delete-all').addEventListener('click', e => {
    let tasksStore = openTransaction('readwrite');
    let statusIndex = tasksStore.index("status");
    let searchRequest = statusIndex.getAll('completed');
    searchRequest.onsuccess = e => {
        let completedTasks = searchRequest.result;
        completedTasks.forEach(task => {
            let id = task.id;
            let deleteRequest = tasksStore.delete(id);
            deleteRequest.onsuccess = e => {
                document.querySelector(`#task_${id}`).remove();
            }
        })
    };
})

/* -----------------------------
--------- switch tabs ----------
----------------------------- */

let tabsList = document.querySelectorAll('#nav-tabs li');
tabsList.forEach(tab => {
    tab.addEventListener('click', e => {
        // change the active tab
        tabsList.forEach(tab => tab.classList.remove('active-tab'));
        e.target.classList.add('active-tab');

        // change the display of delete buttuns
        let deleteAllBtn = document.querySelector('#delete-all');
        deleteAllBtn.classList.remove('d-flex');

        // display tasks according to clicked tab
        let tasks = document.querySelectorAll('#display div');
        tasks.forEach(task => {
            task.querySelector('span').classList.add('d-none');
            if (e.target.id === 'all') {
                task.classList.remove('d-none');
            } else {
                task.classList.add('d-none');
                if (e.target.id === 'active' && task.getAttribute('data-status') === 'active') {
                    task.classList.remove('d-none');
                }
                if (e.target.id === 'completed' && task.getAttribute('data-status') === 'completed') {
                    task.classList.remove('d-none');
                    task.querySelector('span').classList.remove('d-none');
                    deleteAllBtn.classList.add('d-flex');
                }
            }
        })
    })
})

/* -----------------------------
--- storing data in indexedDB --
----------------------------- */

// get all storing tasks to update the UI
function createAllTasks() {
    let tasksStore = openTransaction('readonly');
    let allTasks = tasksStore.getAll();
    allTasks.onsuccess = e => {
        tasks = allTasks.result;
        for (let i = 0; i < tasks.length; i++) {
            count = parseInt(tasks[i].id) > count ? parseInt(tasks[i].id) : count;
            createNewTaskInDom(tasks[i]);
        }
        count++;
    }
}

function openTransaction(type) {
    let transaction = db.transaction("tasks", type);
    return transaction.objectStore("tasks");
}