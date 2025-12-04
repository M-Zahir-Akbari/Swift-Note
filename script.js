// Optional: small Tailwind config to extend the palette
tailwind.config = {
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#f5f7ff',
                    100: '#ebefff',
                    500: '#4f46e5',
                    700: '#3b37b3'
                }
            }
        }
    }
}

// App state
const app = {
    notes: [],
    filters: {
        showCompleted: true,
        priority: 'all',
        tag: null,
        search: '',
        sort: 'updated_desc'
    }
};

// Utilities
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const save = () => localStorage.setItem('swiftnotes:v1', JSON.stringify(app.notes));
const load = () => JSON.parse(localStorage.getItem('swiftnotes:v1') || '[]');
const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '';

// DOM refs
const notesGrid = document.getElementById('notes-grid');
const noteCount = document.getElementById('note-count');
const emptyState = document.getElementById('empty-state');
const newNoteBtn = document.getElementById('new-note-btn');
const editorModal = document.getElementById('editor-modal');
const editorForm = document.getElementById('editor-form');
const editorTitle = document.getElementById('editor-title');
const noteIdInput = document.getElementById('note-id');
const noteTitleInput = document.getElementById('note-title');
const noteBodyInput = document.getElementById('note-body');
const noteDue = document.getElementById('note-due');
const notePriority = document.getElementById('note-priority');
const noteTagsInput = document.getElementById('note-tags');
const deleteNoteBtn = document.getElementById('delete-note');
const filterComplete = document.getElementById('filter-complete');
const tagsList = document.getElementById('tags-list');
const sortSelect = document.getElementById('sort-select');
const searchInput = document.getElementById('global-search');
const clearSearchBtn = document.getElementById('clear-search');

// Init
function init() {
    app.notes = load();
    bindUI();
    render();
}

function bindUI() {
    newNoteBtn.addEventListener('click', () => openEditor());
    document.getElementById('close-editor').addEventListener('click', closeEditor);
    editorForm.addEventListener('submit', onSaveNote);
    deleteNoteBtn.addEventListener('click', onDeleteNote);
    filterComplete.addEventListener('change', (e) => { app.filters.showCompleted = e.target.checked; render(); });
    document.querySelectorAll('.priority-filter').forEach(b => b.addEventListener('click', onPriorityFilter));
    sortSelect.addEventListener('change', (e) => { app.filters.sort = e.target.value; render(); });
    searchInput.addEventListener('input', (e) => { app.filters.search = e.target.value.trim(); render(); });
    clearSearchBtn.addEventListener('click', () => { searchInput.value = ''; app.filters.search = ''; render(); });
    document.getElementById('empty-new').addEventListener('click', () => openEditor());
}

function onPriorityFilter(e) {
    document.querySelectorAll('.priority-filter').forEach(b => b.classList.remove('bg-brand-500', 'text-white'));
    e.target.classList.add('bg-brand-500', 'text-white');
    app.filters.priority = e.target.dataset.priority;
    render();
}

function openEditor(note = null) {
    editorModal.classList.remove('hidden');
    if (!note) {
        editorTitle.textContent = 'New Note';
        noteIdInput.value = '';
        noteTitleInput.value = '';
        noteBodyInput.value = '';
        noteDue.value = '';
        notePriority.value = 'low';
        noteTagsInput.value = '';
        deleteNoteBtn.classList.add('hidden');
    } else {
        editorTitle.textContent = 'Edit';
        noteIdInput.value = note.id;
        noteTitleInput.value = note.title;
        noteBodyInput.value = note.body;
        noteDue.value = note.due || '';
        notePriority.value = note.priority;
        noteTagsInput.value = (note.tags || []).join(', ');
        deleteNoteBtn.classList.remove('hidden');
    }
}

function closeEditor() {
    editorModal.classList.add('hidden');
}

function onSaveNote(e) {
    e.preventDefault();
    const id = noteIdInput.value || uid();
    const note = {
        id,
        title: noteTitleInput.value.trim() || 'Untitled',
        body: noteBodyInput.value.trim(),
        due: noteDue.value || null,
        priority: notePriority.value,
        tags: (noteTagsInput.value || '').split(',').map(t => t.trim()).filter(Boolean),
        completed: false,
        updatedAt: new Date().toISOString()
    };

    const idx = app.notes.findIndex(n => n.id === id);
    if (idx >= 0) {
        // keep completed state
        note.completed = app.notes[idx].completed;
        app.notes[idx] = { ...app.notes[idx], ...note };
    } else {
        app.notes.unshift(note);
    }

    save();
    render();
    closeEditor();
}

function onDeleteNote() {
    const id = noteIdInput.value;
    if (!id) return;
    app.notes = app.notes.filter(n => n.id !== id);
    save();
    closeEditor();
    render();
}

function toggleComplete(id) {
    const idx = app.notes.findIndex(n => n.id === id);
    if (idx < 0) return;
    app.notes[idx].completed = !app.notes[idx].completed;
    app.notes[idx].updatedAt = new Date().toISOString();
    save();
    render();
}

function editNote(id) {
    const note = app.notes.find(n => n.id === id);
    if (!note) return;
    openEditor(note);
}

function render() {
    // Apply filters & Sort
    let items = [...app.notes];

    // search
    if (app.filters.search) {
        const q = app.filters.search.toLowerCase();
        items = items.filter(n => (n.title + ' ' + n.body + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(q));
    }

    // Completed filter
    if (!app.filters.showCompleted) {
        items = items.filter(n => !n.completed);
    }

    // priority filter
    if (app.filters.priority && app.filters.priority !== 'all') {
        items = items.filter(n => n.priority === app.filters.priority);
    }

    // tag filter
    if (app.filters.tag) {
        items = items.filter(n => (n.tags || []).includes(app.filters.tag));
    }

    // sort
    if (app.filters.sort === 'updated_desc') {
        items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else if (app.filters.sort === 'due_asc') {
        items.sort((a, b) => (a.due || '') > (b.due || '') ? 1 : -1);
    } else if (app.filters.sort === 'priority_desc') {
        const map = { high: 3, medium: 2, low: 1 };
        items.sort((a, b) => (map[b.priority] || 0) - (map[a.priority] || 0));
    }

    // update counts & tags
    document.getElementById('count-complete').textContent = app.notes.filter(n => n.completed).length;
    noteCount.textContent = items.length;

    // tags list
    const tagCounts = {};
    app.notes.forEach(n => (n.tags || []).forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1));
    tagsList.innerHTML = '';
    Object.keys(tagCounts).sort().forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'px-3 py-1 rounded-full border text-sm';
        btn.textContent = `${tag} (${tagCounts[tag]})`;
        btn.addEventListener('click', () => { app.filters.tag = tag; render(); });
        tagsList.appendChild(btn);
    });

    // render cards
    notesGrid.innerHTML = '';
    if (!items.length) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }

    const tpl = document.getElementById('note-template');
    items.forEach(note => {
        const node = tpl.content.cloneNode(true);
        const el = node.querySelector('div');
        const title = node.querySelector('.note-title');
        const body = node.querySelector('.note-body');
        const meta = node.querySelector('.note-meta');
        const tagsWrap = node.querySelector('.note-tags');
        const editBtn = node.querySelector('.edit-btn');
        const toggleBtn = node.querySelector('.toggle-complete');

        title.textContent = note.title;
        body.textContent = note.body || '';
        meta.textContent = [note.priority ? note.priority.charAt(0).toUpperCase() + note.priority.slice(1) : '', note.due ? ' • Due: ' + formatDate(note.due) : '', note.updatedAt ? ' • Updated: ' + new Date(note.updatedAt).toLocaleString() : ''].filter(Boolean).join('');

        // tags
        (note.tags || []).forEach(t => {
            const tEl = document.createElement('span');
            tEl.className = 'text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600';
            tEl.textContent = t;
            tEl.addEventListener('click', () => { app.filters.tag = t; render(); });
            tagsWrap.appendChild(tEl);
        });

        // state
        if (note.completed) {
            el.classList.add('opacity-60');
            toggleBtn.textContent = 'Undo';
        } else {
            toggleBtn.textContent = 'Done';
        }

        editBtn.addEventListener('click', () => editNote(note.id));
        toggleBtn.addEventListener('click', () => toggleComplete(note.id));

        notesGrid.appendChild(node);
    });

    save();
}

// bootstrap
init();

// Accessibility: close modal with escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEditor();
});
