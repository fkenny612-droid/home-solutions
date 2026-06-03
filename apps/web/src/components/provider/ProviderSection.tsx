'use client'

import { useState } from 'react'
import PhoneFrame from '@/components/ui/PhoneFrame'

const SKILLS = [
  { id: 'plumbing', icon: 'ti-droplet', label: 'Plumbing' },
  { id: 'electrical', icon: 'ti-bolt', label: 'Electrical' },
  { id: 'cleaning', icon: 'ti-wash', label: 'Cleaning' },
  { id: 'handyman', icon: 'ti-tools', label: 'Handyman' },
]

const AVAIL = [
  { label: 'Mon – Fri', on: true },
  { label: 'Saturday', on: true },
  { label: 'Sunday', on: false },
  { label: 'Emergency callouts', on: true },
]

const JOBS = [
  { icon: 'ti-droplet', bg: '#DBEAFE', ic: '#1D4ED8', name: 'Geyser repair', detail: 'Today · Priya G. · ★★★★★', amt: 'R 1 000' },
  { icon: 'ti-droplet', bg: '#DBEAFE', ic: '#1D4ED8', name: 'Burst pipe fix', detail: 'Yesterday · Ahmed P. · ★★★★★', amt: 'R 1 450' },
  { icon: 'ti-droplet', bg: '#DBEAFE', ic: '#1D4ED8', name: 'Drain blockage', detail: '22 May · Mark W. · ★★★★☆', amt: 'R 650' },
]

export default function ProviderSection() {
  const [selectedSkills, setSelectedSkills] = useState(['plumbing', 'cleaning'])
  const [avail, setAvail] = useState(AVAIL.map(a => a.on))
  const [idUploaded] = useState(true)
  const [certUploaded, setCertUploaded] = useState(false)
  const [bankUploaded, setBankUploaded] = useState(false)
  const [online, setOnline] = useState(true)

  const toggleSkill = (id: string) =>
    setSelectedSkills(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const toggleAvail = (i: number) =>
    setAvail(prev => { const n = [...prev]; n[i] = !n[i]; return n })

  return (
    <div style={{ padding: 32 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Provider mobile app</div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#fff', marginBottom: 8 }}>Onboarding & earnings</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
        {/* Onboarding phone */}
        <PhoneFrame label="KYC onboarding">
          {/* Onboarding header */}
          <div style={{ background: 'var(--navy)', padding: 18, color: '#fff' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Step 2 of 4</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, marginBottom: 2 }}>Verify your identity</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Upload docs to start earning</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
              {[true, true, false, false].map((done, i) => (
                <div key={i} style={{ height: 3, borderRadius: 3, flex: 1, background: done ? (i === 1 ? 'rgba(200,146,42,0.55)' : 'var(--gold)') : 'rgba(255,255,255,0.18)' }} />
              ))}
            </div>
          </div>

          <div className="no-scrollbar" style={{ padding: 13, background: 'var(--cream)', overflowY: 'auto', maxHeight: 520 }}>
            {/* Skills */}
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', marginBottom: 7 }}>Your skills</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 11 }}>
              {SKILLS.map(s => (
                <div
                  key={s.id}
                  onClick={() => toggleSkill(s.id)}
                  style={{
                    padding: '8px 9px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, transition: 'all 0.15s',
                    border: selectedSkills.includes(s.id) ? '1px solid var(--gold)' : '1px solid var(--cream-mid)',
                    background: selectedSkills.includes(s.id) ? '#FFFBF0' : '#fff',
                    color: selectedSkills.includes(s.id) ? 'var(--gold)' : 'var(--text-muted)',
                    fontWeight: selectedSkills.includes(s.id) ? 500 : 400,
                  }}
                >
                  <i className={`ti ${s.icon}`} style={{ fontSize: 14 }} />{s.label}
                </div>
              ))}
            </div>

            {/* KYC docs */}
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', marginBottom: 7 }}>KYC documents</div>
            {[
              { label: 'SA ID / Passport', sub: 'ID_front.jpg uploaded ✓', done: idUploaded, onUpload: undefined },
              { label: 'Trade certificate', sub: certUploaded ? 'pirb_cert.pdf ✓' : 'Tap to upload PDF', done: certUploaded, onUpload: () => setCertUploaded(true) },
              { label: 'Bank confirmation letter', sub: bankUploaded ? 'bank_letter.pdf ✓' : 'For payout processing', done: bankUploaded, onUpload: () => setBankUploaded(true) },
            ].map(d => (
              <div
                key={d.label}
                onClick={d.onUpload}
                style={{
                  border: d.done ? '1.5px solid var(--accent)' : '1.5px dashed var(--cream-mid)',
                  borderRadius: 10, padding: 13, textAlign: 'center', marginBottom: 8, cursor: d.onUpload ? 'pointer' : 'default',
                  background: d.done ? '#EAF5EE' : '#fff', transition: 'border-color 0.2s',
                }}
              >
                <i className={`ti ${d.done ? 'ti-circle-check' : 'ti-upload'}`} style={{ fontSize: 20, color: d.done ? 'var(--accent)' : 'var(--text-light)', marginBottom: 4, display: 'block' }} />
                <div style={{ fontSize: 11, fontWeight: 500, color: d.done ? 'var(--accent)' : 'var(--text)' }}>{d.label}</div>
                <div style={{ fontSize: 10, color: d.done ? 'var(--accent)' : 'var(--text-light)', marginTop: 1 }}>{d.sub}</div>
              </div>
            ))}

            {/* Availability */}
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', margin: '9px 0 6px' }}>Availability</div>
            <div style={{ background: '#fff', borderRadius: 10, padding: '9px 11px', border: '1px solid var(--cream-mid)' }}>
              {AVAIL.map((a, i) => (
                <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < AVAIL.length - 1 ? '1px solid var(--cream-mid)' : 'none', fontSize: 12 }}>
                  <span>{a.label}</span>
                  <div
                    onClick={() => toggleAvail(i)}
                    style={{ width: 30, height: 18, background: avail[i] ? 'var(--accent)' : 'var(--cream-mid)', borderRadius: 9, position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
                  >
                    <div style={{ position: 'absolute', top: 2.5, right: avail[i] ? 2.5 : 14.5, width: 13, height: 13, background: '#fff', borderRadius: '50%', transition: 'right 0.2s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '11px 13px', background: '#fff', borderTop: '1px solid var(--cream-mid)' }}>
            <button style={{ width: '100%', padding: 11, borderRadius: 10, border: 'none', background: 'var(--gold)', color: 'var(--navy)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Continue to step 3
            </button>
          </div>
        </PhoneFrame>

        {/* Earnings phone */}
        <PhoneFrame label="Earnings dashboard">
          <div style={{ background: 'var(--navy)', padding: 16, color: '#fff' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 1 }}>Your earnings</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 15, marginBottom: 11 }}>Raj Pillay</div>

            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, marginBottom: 9 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase' }}>Available to withdraw</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, margin: '2px 0' }}>R 4 840</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>7 completed jobs this week</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {[{ label: 'This month', val: 'R 28 440' }, { label: 'Jobs done', val: '892 total' }].map(m => (
                <div key={m.label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 9 }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', marginBottom: 1 }}>{m.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{m.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="no-scrollbar" style={{ padding: 13, background: 'var(--cream)', overflowY: 'auto', maxHeight: 430 }}>
            {/* Online toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 10, padding: '11px 12px', border: '1px solid var(--cream-mid)', marginBottom: 9 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Available for jobs</div>
                <div style={{ fontSize: 10, color: 'var(--text-light)' }}>Toggle to go offline</div>
              </div>
              <div
                onClick={() => setOnline(o => !o)}
                style={{ width: 40, height: 23, background: online ? 'var(--accent)' : 'var(--cream-mid)', borderRadius: 12, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <div style={{ position: 'absolute', top: 3.5, right: online ? 3.5 : 20.5, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: 'right 0.2s' }} />
              </div>
            </div>

            {/* Rating summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#fff', borderRadius: 10, padding: '11px 12px', border: '1px solid var(--cream-mid)', marginBottom: 9 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, color: 'var(--gold)' }}>★</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, fontWeight: 300, color: 'var(--navy)' }}>4.9</div>
                <div style={{ fontSize: 9, color: 'var(--text-light)' }}>214 reviews</div>
              </div>
              <div style={{ flex: 1 }}>
                {[{ n: 5, pct: 88 }, { n: 4, pct: 10 }, { n: 3, pct: 2 }].map(r => (
                  <div key={r.n} style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {r.n}
                    <div style={{ width: 70, height: 4, background: 'var(--cream-mid)', borderRadius: 3, overflow: 'hidden', display: 'inline-block', marginLeft: 4 }}>
                      <div style={{ height: '100%', width: `${r.pct}%`, background: 'var(--gold)', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent jobs */}
            <div style={{ fontSize: 9, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 }}>Recent jobs</div>
            {JOBS.map(j => (
              <div key={j.name} style={{ background: '#fff', borderRadius: 9, padding: '10px 11px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 9, border: '1px solid var(--cream-mid)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: j.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${j.icon}`} style={{ color: j.ic }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{j.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 1 }}>{j.detail}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)', flexShrink: 0 }}>{j.amt}</div>
              </div>
            ))}

            {/* Withdraw */}
            <div style={{ marginTop: 11 }}>
              <button style={{ width: '100%', padding: 11, borderRadius: 10, border: 'none', background: 'var(--gold)', color: 'var(--navy)', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <i className="ti ti-cash" /> Withdraw R 4 840 via Peach Payments
              </button>
              <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-light)', marginTop: 6 }}>Transfers within 1–2 business days</div>
            </div>
          </div>
        </PhoneFrame>
      </div>
    </div>
  )
}
