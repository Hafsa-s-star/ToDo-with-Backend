import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
  autoConnect: true,
})

const filters = [
  { id: 'all', label: 'All tasks', icon: 'grid' },
  { id: 'today', label: 'Today', icon: 'sun' },
  { id: 'upcoming', label: 'Upcoming', icon: 'calendar' },
  { id: 'completed', label: 'Completed', icon: 'check' },
]

const categories = ['Personal', 'Work', 'Wellness', 'Learning']

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2m0 15v2m9.5-9.5h-2m-15 0h-2m16.2-6.7-1.4 1.4M6.7 17.3l-1.4 1.4m13.4 0-1.4-1.4M6.7 6.7 5.3 5.3" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.6 2.6L16.5 9" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" /></>,
    sparkle: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  }

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

function dateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDueDate(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day))
}

function getTaskDateState(task) {
  if (!task.dueDate || task.completed) return ''
  if (task.dueDate < dateKey()) return 'overdue'
  if (task.dueDate === dateKey()) return 'due-today'
  return ''
}

function App() {
  const [todos, setTodos] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState(null)
  const [connection, setConnection] = useState('connecting')
  const [notice, setNotice] = useState('')
  const [clearing, setClearing] = useState(false)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const handleConnect = () => {
      setConnection('online')
      socket.emit('get-todos')
    }
    const handleDisconnect = () => setConnection('offline')
    const handleConnectError = () => setConnection('offline')
    const handleTodoError = ({ message } = {}) => setNotice(message || 'The task service encountered an error.')
    const handleSnapshot = (items) => setTodos(Array.isArray(items) ? items : [])
    const handleAdded = (todo) => setTodos((current) => current.some((item) => item.id === todo.id) ? current : [todo, ...current])
    const handleUpdated = (todo) => setTodos((current) => current.map((item) => item.id === todo.id ? todo : item))
    const handleDeleted = ({ id }) => setTodos((current) => current.filter((todo) => todo.id !== id))
    const handleCleared = () => setTodos((current) => current.filter((todo) => !todo.completed))

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.on('todo-error', handleTodoError)
    socket.on('todos-snapshot', handleSnapshot)
    socket.on('todo-added', handleAdded)
    socket.on('todo-updated', handleUpdated)
    socket.on('todo-deleted', handleDeleted)
    socket.on('todos-cleared', handleCleared)

    if (socket.connected) handleConnect()

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.off('todo-error', handleTodoError)
      socket.off('todos-snapshot', handleSnapshot)
      socket.off('todo-added', handleAdded)
      socket.off('todo-updated', handleUpdated)
      socket.off('todo-deleted', handleDeleted)
      socket.off('todos-cleared', handleCleared)
    }
  }, [])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    const handleShortcut = (event) => {
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
      if (event.key === 'Escape' && isEditorOpen) {
        setIsEditorOpen(false)
        setEditingTodo(null)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [isEditorOpen])

  const activeCount = todos.filter((todo) => !todo.completed).length
  const completedCount = todos.length - activeCount

  const visibleTodos = useMemo(() => {
    const query = search.trim().toLowerCase()
    return todos
      .filter((todo) => {
        if (filter === 'today') return !todo.completed && todo.dueDate && todo.dueDate <= dateKey()
        if (filter === 'upcoming') return !todo.completed && todo.dueDate && todo.dueDate > dateKey()
        if (filter === 'completed') return todo.completed
        return true
      })
      .filter((todo) => !query || `${todo.title} ${todo.notes} ${todo.category}`.toLowerCase().includes(query))
      .sort((a, b) => Number(a.completed) - Number(b.completed) || (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31') || (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [filter, search, todos])

  const submitTodo = (values) => {
    if (!socket.connected) {
      setNotice('You’re offline. Reconnect to save your task.')
      return
    }

    const isEditing = Boolean(editingTodo)
    const payload = isEditing
      ? { id: editingTodo.id, changes: values }
      : { id: crypto.randomUUID(), ...values, completed: false }
    socket.emit(isEditing ? 'update-todo' : 'add-todo', payload, (result) => {
      if (!result?.ok) {
        setNotice(result?.error || 'That task could not be saved.')
        return
      }
      setIsEditorOpen(false)
      setEditingTodo(null)
    })
  }

  const toggleTodo = (todo) => {
    if (!socket.connected) return setNotice('You’re offline. Reconnect to update tasks.')
    socket.emit('update-todo', { id: todo.id, changes: { completed: !todo.completed } }, (result) => {
      if (!result?.ok) setNotice(result?.error || 'That task could not be updated.')
    })
  }

  const deleteTodo = (todo) => {
    if (!socket.connected) return setNotice('You’re offline. Reconnect to delete tasks.')
    socket.emit('delete-todo', { id: todo.id }, (result) => {
      if (!result?.ok) setNotice(result?.error || 'That task could not be deleted.')
    })
  }

  const clearCompleted = () => {
    if (!socket.connected) return setNotice('You’re offline. Reconnect to clear completed tasks.')
    setClearing(true)
    socket.emit('clear-completed', (result) => {
      setClearing(false)
      if (!result?.ok) setNotice(result?.error || 'Completed tasks could not be cleared.')
    })
  }

  const openEditor = (todo = null) => {
    setEditingTodo(todo)
    setIsEditorOpen(true)
  }

  const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  const heading = filters.find((item) => item.id === filter)?.label || 'All tasks'

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Daymark home"><span className="brand-mark"><Icon name="check" size={17} /></span>daymark<span className="brand-period">.</span></a>
        <div className="topbar-tools">
          <label className="search-field">
            <Icon name="search" size={17} />
            <input ref={searchInputRef} aria-label="Search tasks" placeholder="Search tasks..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <kbd>/</kbd>
          </label>
          <span className={`sync-status ${connection}`}><i />{connection === 'online' ? 'Synced' : connection === 'connecting' ? 'Connecting' : 'Offline'}</span>
        </div>
      </header>

      <main className="page-content">
        <section className="welcome-row">
          <div>
            <p className="date-label">{todayLabel}</p>
            <h1>Your day, <em>in good order.</em></h1>
            <p className="welcome-subtitle">A simple place to keep track of what matters.</p>
          </div>
          <button className="primary-button" onClick={() => openEditor()}><Icon name="plus" size={17} />New task</button>
        </section>

        <div className="quick-stats" aria-label="Task summary">
          <span><strong>{activeCount}</strong> open</span><span className="stats-divider" /><span><strong>{completedCount}</strong> completed</span>
        </div>

        <section className="task-section">
          <div className="section-heading">
            <div className="section-title-row"><h2>{heading}</h2><span className="task-total">{visibleTodos.length}</span></div>
            {completedCount > 0 && <button className="text-button" onClick={clearCompleted} disabled={clearing}>{clearing ? 'Clearing…' : 'Clear completed'}</button>}
          </div>

          <nav className="filter-tabs" aria-label="Task filters">
            {filters.map((item) => {
              const count = item.id === 'completed'
                ? completedCount
                : item.id === 'today'
                  ? todos.filter((todo) => !todo.completed && todo.dueDate && todo.dueDate <= dateKey()).length
                  : item.id === 'upcoming'
                    ? todos.filter((todo) => !todo.completed && todo.dueDate > dateKey()).length
                    : activeCount
              return <button key={item.id} className={filter === item.id ? 'selected' : ''} onClick={() => setFilter(item.id)}>{item.label}<span>{count}</span></button>
            })}
          </nav>

          {notice && <div className="notice" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice('')}><Icon name="close" size={15} /></button></div>}

          {visibleTodos.length ? (
            <div className="task-list">
              {visibleTodos.map((todo) => {
                const dateState = getTaskDateState(todo)
                return (
                  <article className={`task-row ${todo.completed ? 'is-completed' : ''}`} key={todo.id}>
                    <button className={`task-checkbox ${todo.completed ? 'checked' : ''}`} aria-label={todo.completed ? `Mark ${todo.title} active` : `Complete ${todo.title}`} onClick={() => toggleTodo(todo)}>
                      {todo.completed && <Icon name="check" size={13} />}
                    </button>
                    <div className="task-copy">
                      <div className="task-title-line"><h3>{todo.title}</h3>{todo.priority === 'high' && !todo.completed && <span className="priority-mark">Important</span>}</div>
                      {todo.notes && <p className="task-notes">{todo.notes}</p>}
                      <div className="task-meta">
                        <span className="category-pill">{todo.category || 'Personal'}</span>
                        {todo.dueDate && <span className={`due-date ${dateState}`}><Icon name="calendar" size={13} />{dateState === 'overdue' ? 'Overdue · ' : ''}{formatDueDate(todo.dueDate)}</span>}
                      </div>
                    </div>
                    <div className="task-actions">
                      <button aria-label={`Edit ${todo.title}`} title="Edit task" onClick={() => openEditor(todo)}><Icon name="edit" size={16} /></button>
                      <button className="delete-action" aria-label={`Delete ${todo.title}`} title="Delete task" onClick={() => deleteTodo(todo)}><Icon name="trash" size={16} /></button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon"><Icon name={filter === 'completed' ? 'check' : 'grid'} size={21} /></span>
              <h3>{search ? 'No matching tasks' : filter === 'completed' ? 'No completed tasks yet' : filter === 'upcoming' ? 'Nothing coming up' : filter === 'today' ? 'Nothing due today' : 'Your list is clear'}</h3>
              <p>{search ? 'Try another search or clear the search field.' : filter === 'completed' ? 'Completed tasks will appear here.' : filter === 'upcoming' ? 'Tasks with a future due date will appear here.' : 'Add a task whenever you’re ready.'}</p>
              {!search && filter !== 'completed' && <button className="empty-button" onClick={() => openEditor()}><Icon name="plus" size={16} />Add a task</button>}
            </div>
          )}

          <div className="list-footer"><span><span className={`connection-dot ${connection}`} />{connection === 'online' ? 'Tasks sync live' : 'Reconnect to sync tasks'}</span><span>{activeCount} left</span></div>
        </section>
        <footer className="page-footer">Small steps, every day.</footer>
      </main>

      {isEditorOpen && <TodoEditor todo={editingTodo} onClose={() => { setIsEditorOpen(false); setEditingTodo(null) }} onSubmit={submitTodo} />}
    </div>
  )
}

function TodoEditor({ todo, onClose, onSubmit }) {
  const [title, setTitle] = useState(todo?.title || '')
  const [notes, setNotes] = useState(todo?.notes || '')
  const [category, setCategory] = useState(todo?.category || 'Personal')
  const [priority, setPriority] = useState(todo?.priority || 'normal')
  const [dueDate, setDueDate] = useState(todo?.dueDate || '')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError('Give your task a name before saving.')
      return
    }
    onSubmit({ title: cleanTitle, notes: notes.trim(), category, priority, dueDate })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form className="todo-modal" onSubmit={handleSubmit}>
        <div className="modal-top">
          <span className="modal-icon"><Icon name={todo ? 'edit' : 'sparkle'} size={19} /></span>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}><Icon name="close" size={19} /></button>
        </div>
        <p className="eyebrow">{todo ? 'MAKE IT YOURS' : 'ONE THING AT A TIME'}</p>
        <h2>{todo ? 'Edit your task' : 'What’s on your mind?'}</h2>
        <p className="modal-intro">{todo ? 'A few details can make the next step clearer.' : 'Capture it here. You can figure out the how later.'}</p>
        <label className="form-label" htmlFor="task-title">Task name</label>
        <input id="task-title" className="title-input" autoFocus maxLength={120} placeholder="e.g. Plan the week ahead" value={title} onChange={(event) => { setTitle(event.target.value); setError('') }} />
        <label className="form-label" htmlFor="task-notes">A few details <span>OPTIONAL</span></label>
        <textarea id="task-notes" className="notes-input" rows={3} maxLength={500} placeholder="Add a note or the first small step..." value={notes} onChange={(event) => setNotes(event.target.value)} />
        <div className="form-grid">
          <label><span className="form-label">Area</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span className="form-label">Priority</span><select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="normal">Whenever</option><option value="high">Important</option></select></label>
        </div>
        <label className="form-label" htmlFor="task-date">Due date <span>OPTIONAL</span></label>
        <input id="task-date" className="date-input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">{todo ? 'Save changes' : 'Add to my list'}<Icon name="arrow" size={16} /></button></div>
      </form>
    </div>
  )
}

export default App
