import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { io } from 'socket.io-client'
import { MonacoBinding } from 'y-monaco'
import { useAuth } from '../context/AuthContext'
import { useCollab } from '../hooks/useCollab'
import api from '../services/api'
import Timer from '../components/Timer'

const LANGUAGES = ['javascript', 'python', 'java', 'cpp']

export default function Room() {
  const { roomCode } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const socketRef = useRef(null)
  const editorRef = useRef(null)
  const bindingRef = useRef(null)

  const [session, setSession] = useState(null)
  const [language, setLanguage] = useState('javascript')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [connected, setConnected] = useState(false)
  const [participants, setParticipants] = useState([])
  const [outputStatus, setOutputStatus] = useState('idle')
  const [testResults, setTestResults] = useState([])


const [submitResults, setSubmitResults] = useState(null)  // null = not submitted yet
const [submitting, setSubmitting] = useState(false)
const [submitted, setSubmitted] = useState(false)


  // load session
  useEffect(() => {
    api.get(`/sessions/room/${roomCode}`)
      .then(res => {
        setSession(res.data.session)
        if (res.data.session.state?.language) {
          setLanguage(res.data.session.state.language)
        }
      })
      .catch(() => navigate('/dashboard'))
  }, [roomCode])

  // init socket
  useEffect(() => {
    if (!user) return
    const socket = io('https://coding-interviewplatform.onrender.com')
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join-room', { roomCode, user })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('user-joined', ({ user: u }) => {
      setParticipants(prev => [...prev.filter(p => p.id !== u.id), u])
    })

    socket.on('user-left', ({ user: u }) => {
      setParticipants(prev => prev.filter(p => p.id !== u?.id))
    })

    socket.on('language-update', ({ language: lang }) => setLanguage(lang))

    socket.on('run-result', ({ output: result, status, testResults: tr }) => {
      setOutput(result)
      setOutputStatus(status || 'idle')
      setTestResults(tr || [])
      setRunning(false)
    })

    socket.on('submit-result', ({ output: result, status, testResults: tr, score, total }) => {
  setSubmitResults({ output: result, status, testResults: tr, score, total })
  setSubmitting(false)
  setSubmitted(true)
})

    return () => socket.disconnect()
  }, [user, roomCode])

  // Yjs collab
  const { ydoc, ytext, awareness } = useCollab(socketRef.current, roomCode, user)

  // bind Yjs to Monaco when editor mounts
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor

    // wait for ytext to be ready
    const tryBind = () => {
      if (!ytextRef.current) {
        setTimeout(tryBind, 100)
        return
      }
      if (bindingRef.current) bindingRef.current.destroy()
      bindingRef.current = new MonacoBinding(
        ytext.current,
        editor.getModel(),
        new Set([editor]),
        null
      )
    }
    tryBind()
  }

  // need a stable ref for ytext for the mount callback
  const ytextRef = ytext

  const handleLanguageChange = (e) => {
  const lang = e.target.value
  setLanguage(lang)

  socketRef.current?.emit('language-change', { roomCode, language: lang })
}
   
    

  const handleRunCode = () => {
    setRunning(true)
    setOutput('Running...')
    const code = editorRef.current?.getValue() || ''
    const questionId = session?.sessionQuestions?.[0]?.question?.id
    console.log('questionId:', questionId)
    console.log('session:', session)
    socketRef.current?.emit('run-code', { roomCode, code, language, questionId })
    // save submission to DB
    if (session?.id) {
      api.post('/submissions', {
        sessionId: session.id,
        code,
        language,
        output: ''
      }).catch(err => console.error('Failed to save submission:', err))
    }
  }


  const handleSubmitCode = () => {
  if (submitted) return

  setSubmitting(true)

  const code = editorRef.current?.getValue() || ''
  const questionId = session?.sessionQuestions?.[0]?.question?.id

  socketRef.current?.emit('submit-code', {
    roomCode,
    code,
    language,
    questionId,
    role: user?.role
  })
}

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.leftBar}>
          <span style={styles.roomCodeLabel}>{roomCode}</span>
          <span style={{ ...styles.dot, background: connected ? '#22c55e' : '#ef4444' }} />
          <span style={styles.connLabel}>{connected ? 'Connected' : 'Disconnected'}</span>
          {awareness.map((a, i) => (
            <span key={i} style={{ ...styles.cursorBadge, background: a.user?.color }}>
              {a.user?.name}
            </span>
          ))}


          
          <Timer
            socket={socketRef.current}
            roomCode={roomCode}
            isInterviewer={user?.role === 'INTERVIEWER'}
          />


        </div>
        <div style={styles.rightBar}>
          <select style={styles.select} value={language} onChange={handleLanguageChange}>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <button style={styles.runBtn} onClick={handleRunCode} disabled={running}>
            {running ? 'Running...' : 'Run Code'}
          </button>
          {/* Show Submit button only to students */}
{user?.role === 'STUDENT' && (
  <button
    onClick={handleSubmitCode}
    disabled={submitting || submitted}
    style={{
      padding: '7px 18px',
      background: submitted ? '#166534' : '#4f46e5',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: submitted ? 'not-allowed' : 'pointer',
      fontSize: '13px'
    }}
  >
    {submitting ? 'Submitting...' : submitted ? '✅ Submitted' : '🚀 Submit'}
  </button>
)}
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
            Leave
          </button>
        </div>
      </div>

      <div style={styles.main}>
        {/* Question panel */}
        <div style={styles.questionPanel}>
          <span style={styles.diffBadge}>
            {session?.sessionQuestions?.[0]?.question?.difficulty || '...'}
          </span>
          <h3 style={styles.questionTitle}>
            {session?.sessionQuestions?.[0]?.question?.title || 'Loading...'}
          </h3>
          <p style={styles.questionDesc}>
            {session?.sessionQuestions?.[0]?.question?.description || ''}
          </p>
        </div>

        {/* Editor */}
        <div style={styles.editorPanel}>
          <Editor
            height="100%"
            language={language}
            defaultValue="// Start coding here"
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true
            }}
          />
        </div>

        {/* Output panel */}
        <div style={styles.outputPanel}>
          <p style={styles.outputLabel}>Output</p>
          <pre style={{
            ...styles.outputText,
            color: outputStatus === 'error' ? '#f87171' : '#86efac'
          }}>
            {output || 'Run your code to see output here.'}
          </pre>
{testResults.length > 0 && (
  <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
    {user?.role === 'INTERVIEWER'
      ? `${testResults.filter(t => t.passed).length}/${testResults.length} passed`
      : `${testResults.filter(t => !t.isHidden && t.passed).length}/${
          testResults.filter(t => !t.isHidden).length
        } visible tests passed`
    }
  </p>
)}
          {testResults.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={styles.outputLabel}>Test Cases</p>
              {testResults.map((tc, i) => {
  // Students cannot see hidden test cases at all
  if (tc.isHidden && user?.role !== 'INTERVIEWER') {
    return null;
  }
  return (
    <div key={i} style={{
      background: tc.passed ? '#14532d' : '#450a0a',
      border: `1px solid ${tc.passed ? '#16a34a' : '#dc2626'}`,
      borderRadius: '8px',
      padding: '10px',
      marginBottom: '8px',
      fontSize: '12px'
    }}>
      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: tc.passed ? '#86efac' : '#f87171', fontWeight: '700' }}>
          {tc.passed ? '✅ Passed' : '❌ Failed'}
        </span>
        <span style={{ color: '#888', marginLeft: '8px' }}>Test {i + 1}</span>
        {tc.isHidden && (
          <span style={{ color: '#a78bfa', marginLeft: '8px', fontSize: '11px' }}>
            🔒 Hidden
          </span>
        )}
      </div>
      {/* Interviewer sees full details. Student sees no details for hidden tests */}
      {user?.role === 'INTERVIEWER' ? (
        <>
          <div style={{ color: '#94a3b8' }}>Input: {tc.input}</div>
          <div style={{ color: '#94a3b8' }}>Expected: {tc.expectedOutput}</div>
          {!tc.passed && (
            <div style={{ color: '#f87171' }}>Got: {tc.actualOutput}</div>
          )}
        </>
      ) : (
        // Student sees input/expected only for visible test cases
        <>
          <div style={{ color: '#94a3b8' }}>Input: {tc.input}</div>
          <div style={{ color: '#94a3b8' }}>Expected: {tc.expectedOutput}</div>
          {!tc.passed && (
            <div style={{ color: '#f87171' }}>Got: {tc.actualOutput}</div>
          )}
        </>
      )}
    </div>
  );
})}
            </div>
          )}
          {submitResults && (
  <div style={{
    marginTop: '1.5rem',
    padding: '16px',
    background: submitResults.status === 'success' ? '#14532d' : '#450a0a',
    border: `2px solid ${submitResults.status === 'success' ? '#16a34a' : '#dc2626'}`,
    borderRadius: '10px'
  }}>
    <p style={{ color: '#fff', fontWeight: '700', fontSize: '15px', margin: '0 0 8px' }}>
      📊 Final Submission Result
    </p>

    <p style={{ color: submitResults.status === 'success' ? '#86efac' : '#f87171', fontSize: '14px' }}>
      {submitResults.output}
    </p>

    <p style={{ color: '#94a3b8', fontSize: '13px' }}>
      Score: {submitResults.score} / {submitResults.total}
    </p>

    {submitResults.testResults.map((tc, i) => {
      if (tc.isHidden && user?.role !== 'INTERVIEWER') return null

      return (
        <div key={i} style={{
          background: '#0f0f0f',
          borderRadius: '6px',
          padding: '8px',
          marginTop: '6px',
          fontSize: '12px'
        }}>
          <span style={{ color: tc.passed ? '#86efac' : '#f87171', fontWeight: '700' }}>
            {tc.passed ? '✅' : '❌'} Test {i + 1}
            {tc.isHidden && <span style={{ color: '#a78bfa' }}> 🔒 Hidden</span>}
          </span>

          {user?.role === 'INTERVIEWER' && (
            <div style={{ marginTop: '4px', color: '#94a3b8' }}>
              <div>Input: {tc.input}</div>
              <div>Expected: {tc.expectedOutput}</div>
              {!tc.passed && (
                <div style={{ color: '#f87171' }}>Got: {tc.actualOutput}</div>
              )}
            </div>
          )}
        </div>
      )
    })}
  </div>
)}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f0f', color: '#fff' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', flexWrap: 'wrap', gap: '8px' },
  leftBar: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  roomCodeLabel: { fontWeight: '700', letterSpacing: '2px', fontSize: '16px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },
  connLabel: { fontSize: '13px', color: '#888' },
  cursorBadge: { fontSize: '11px', padding: '2px 8px', borderRadius: '20px', color: '#000', fontWeight: '600' },
  rightBar: { display: 'flex', alignItems: 'center', gap: '10px' },
  select: { background: '#2a2a2a', color: '#fff', border: '1px solid #3a3a3a', padding: '6px 10px', borderRadius: '6px', fontSize: '13px' },
  runBtn: { background: '#16a34a', color: '#fff', border: 'none', padding: '7px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  backBtn: { background: 'transparent', color: '#888', border: '1px solid #3a3a3a', padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  main: { display: 'flex', flex: 1, overflow: 'hidden' },
  questionPanel: { width: '280px', padding: '1.5rem', borderRight: '1px solid #2a2a2a', overflowY: 'auto' },
  diffBadge: { fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#1e3a5f', color: '#7dd3fc', marginBottom: '12px', display: 'inline-block' },
  questionTitle: { fontSize: '1rem', fontWeight: '600', margin: '10px 0', color: '#e2e8f0' },
  questionDesc: { fontSize: '13px', color: '#94a3b8', lineHeight: '1.7' },
  editorPanel: { flex: 1, overflow: 'hidden' },
  outputPanel: { width: '280px', padding: '1rem', borderLeft: '1px solid #2a2a2a', overflowY: 'auto' },
  outputLabel: { fontSize: '12px', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' },
  outputText: { fontSize: '13px', color: '#86efac', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
}

