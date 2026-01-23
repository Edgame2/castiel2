/**
 * MFA Hooks Usage Examples
 * 
 * This file demonstrates how to use the MFA hooks in React components
 */

// ============================================================================
// Example 1: Display User's MFA Methods
// ============================================================================

import { useMFAMethods } from '@/hooks/use-mfa'
import { getDeviceFingerprint } from '@/lib/device-fingerprint'

function MFAMethodsList() {
  const { data, isLoading, error } = useMFAMethods()

  if (isLoading) return <div>Loading MFA methods...</div>
  if (error) return <div>Error loading MFA methods</div>
  if (!data) return null

  return (
    <div>
      <h2>Your MFA Methods</h2>
      {data.methods.length === 0 ? (
        <p>No MFA methods enrolled</p>
      ) : (
        <ul>
          {data.methods.map((method) => (
            <li key={method.type}>
              <strong>{method.type.toUpperCase()}</strong> - {method.status}
              {method.phoneNumber && <span> ({method.phoneNumber})</span>}
              {method.email && <span> ({method.email})</span>}
            </li>
          ))}
        </ul>
      )}
      <p>Has Active MFA: {data.hasActiveMFA ? 'Yes' : 'No'}</p>
    </div>
  )
}

// ============================================================================
// Example 2: Enroll TOTP (Authenticator App)
// ============================================================================

import { useEnrollTOTP, useVerifyTOTP } from '@/hooks/use-mfa'
import { useState } from 'react'

function TOTPEnrollment() {
  const [enrollmentData, setEnrollmentData] = useState<any>(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  const enrollMutation = useEnrollTOTP()
  const verifyMutation = useVerifyTOTP()

  const handleStartEnrollment = async () => {
    const data = await enrollMutation.mutateAsync()
    setEnrollmentData(data)
  }

  const handleVerify = async () => {
    if (!enrollmentData) return
    
    const result = await verifyMutation.mutateAsync({
      enrollmentToken: enrollmentData.enrollmentToken,
      code,
    })
    
    setRecoveryCodes(result.recoveryCodes)
  }

  if (recoveryCodes.length > 0) {
    return (
      <div>
        <h3>Save Your Recovery Codes</h3>
        <p>Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.</p>
        <ul>
          {recoveryCodes.map((code, i) => (
            <li key={i}>{code}</li>
          ))}
        </ul>
        <button onClick={() => {
          navigator.clipboard.writeText(recoveryCodes.join('\n'))
        }}>
          Copy to Clipboard
        </button>
      </div>
    )
  }

  if (!enrollmentData) {
    return (
      <button 
        onClick={handleStartEnrollment} 
        disabled={enrollMutation.isPending}
      >
        Enroll Authenticator App
      </button>
    )
  }

  return (
    <div>
      <h3>Scan QR Code</h3>
      <img src={enrollmentData.qrCode} alt="QR Code" />
      <p>Or enter this code manually: {enrollmentData.manualEntryCode}</p>
      
      <div>
        <label>Enter 6-digit code from your app:</label>
        <input 
          type="text" 
          value={code} 
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
        />
        <button 
          onClick={handleVerify}
          disabled={verifyMutation.isPending || code.length !== 6}
        >
          Verify
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Example 3: Enroll SMS
// ============================================================================

import { useEnrollSMS, useVerifySMS } from '@/hooks/use-mfa'

function SMSEnrollment() {
  const [enrollmentData, setEnrollmentData] = useState<any>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [code, setCode] = useState('')

  const enrollMutation = useEnrollSMS()
  const verifyMutation = useVerifySMS()

  const handleSendCode = async () => {
    const data = await enrollMutation.mutateAsync({ phoneNumber })
    setEnrollmentData(data)
  }

  const handleVerify = async () => {
    if (!enrollmentData) return
    
    await verifyMutation.mutateAsync({
      enrollmentToken: enrollmentData.enrollmentToken,
      code,
    })
  }

  if (!enrollmentData) {
    return (
      <div>
        <label>Phone Number:</label>
        <input 
          type="tel" 
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+1234567890"
        />
        <button 
          onClick={handleSendCode}
          disabled={enrollMutation.isPending}
        >
          Send SMS Code
        </button>
      </div>
    )
  }

  return (
    <div>
      <p>Code sent to {enrollmentData.maskedPhone}</p>
      <label>Enter 6-digit code:</label>
      <input 
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={6}
      />
      <button 
        onClick={handleVerify}
        disabled={verifyMutation.isPending || code.length !== 6}
      >
        Verify
      </button>
    </div>
  )
}

// ============================================================================
// Example 4: Disable MFA Method
// ============================================================================

import { useDisableMFAMethod } from '@/hooks/use-mfa'

function DisableMFAButton({ methodType }: { methodType: 'totp' | 'sms' | 'email' }) {
  const [password, setPassword] = useState('')
  const disableMutation = useDisableMFAMethod()

  const handleDisable = async () => {
    await disableMutation.mutateAsync({
      methodType,
      password,
    })
  }

  return (
    <div>
      <label>Confirm with password:</label>
      <input 
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button 
        onClick={handleDisable}
        disabled={disableMutation.isPending}
      >
        Disable {methodType.toUpperCase()}
      </button>
    </div>
  )
}

// ============================================================================
// Example 5: MFA Challenge During Login
// ============================================================================

import { useCompleteMFAChallenge } from '@/hooks/use-mfa'

function MFAChallengePage({ 
  challengeToken, 
  availableMethods 
}: { 
  challengeToken: string
  availableMethods: string[] 
}) {
  const [method, setMethod] = useState<'totp' | 'sms' | 'email' | 'recovery'>('totp')
  const [code, setCode] = useState('')
  const challengeMutation = useCompleteMFAChallenge()

  const handleVerify = async () => {
    const result = await challengeMutation.mutateAsync({
      challengeToken,
      code,
      method,
    })

    // Store tokens and redirect
    localStorage.setItem('accessToken', result.accessToken)
    window.location.href = '/dashboard'
  }

  return (
    <div>
      <h2>MFA Verification Required</h2>
      
      <div>
        <label>Select Method:</label>
        <select value={method} onChange={(e) => setMethod(e.target.value as any)}>
          {availableMethods.includes('totp') && <option value="totp">Authenticator App</option>}
          {availableMethods.includes('sms') && <option value="sms">SMS</option>}
          {availableMethods.includes('email') && <option value="email">Email</option>}
          <option value="recovery">Recovery Code</option>
        </select>
      </div>

      <div>
        <label>Enter Code:</label>
        <input 
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={method === 'recovery' ? 'XXXX-XXXX-XXXX' : '123456'}
        />
      </div>

      <button 
        onClick={handleVerify}
        disabled={challengeMutation.isPending || !code}
      >
        Verify
      </button>
    </div>
  )
}

// ============================================================================
// Example 6: Generate Recovery Codes
// ============================================================================

import { useGenerateRecoveryCodes } from '@/hooks/use-mfa'

function GenerateRecoveryCodes() {
  const [password, setPassword] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const generateMutation = useGenerateRecoveryCodes()

  const handleGenerate = async () => {
    const result = await generateMutation.mutateAsync({ password })
    setRecoveryCodes(result.recoveryCodes)
  }

  if (recoveryCodes.length > 0) {
    return (
      <div>
        <h3>Your New Recovery Codes</h3>
        <p className="warning">These codes will only be shown once. Save them now!</p>
        <ul>
          {recoveryCodes.map((code, i) => (
            <li key={i}><code>{code}</code></li>
          ))}
        </ul>
        <button onClick={() => {
          const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a' as any)
          a.href = url
          a.download = 'recovery-codes.txt'
          a.click()
        }}>
          Download as Text File
        </button>
      </div>
    )
  }

  return (
    <div>
      <p>Generate new recovery codes. Your old codes will be invalidated.</p>
      <label>Confirm with password:</label>
      <input 
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button 
        onClick={handleGenerate}
        disabled={generateMutation.isPending}
      >
        Generate New Recovery Codes
      </button>
    </div>
  )
}

// ============================================================================
// Example 7: Admin - MFA Policy Management
// ============================================================================

import { useMFAPolicy, useUpdateMFAPolicy } from '@/hooks/use-mfa'

function MFAPolicySettings() {
  const { data: policyData, isLoading } = useMFAPolicy()
  const updateMutation = useUpdateMFAPolicy()

  const [enforcement, setEnforcement] = useState<'off' | 'optional' | 'required'>('optional')
  const [gracePeriodDays, setGracePeriodDays] = useState(30)

  const handleUpdate = async () => {
    await updateMutation.mutateAsync({
      enforcement,
      gracePeriodDays,
      allowedMethods: ['totp', 'sms', 'email'],
    })
  }

  if (isLoading) return <div>Loading policy...</div>

  return (
    <div>
      <h2>Tenant MFA Policy</h2>
      
      <div>
        <label>Enforcement Level:</label>
        <select value={enforcement} onChange={(e) => setEnforcement(e.target.value as any)}>
          <option value="off">Off - MFA disabled</option>
          <option value="optional">Optional - Users can enable MFA</option>
          <option value="required">Required - All users must use MFA</option>
        </select>
      </div>

      {enforcement === 'required' && (
        <div>
          <label>Grace Period (days):</label>
          <input 
            type="number"
            value={gracePeriodDays}
            onChange={(e) => setGracePeriodDays(parseInt(e.target.value))}
            min={0}
            max={90}
          />
        </div>
      )}

      <button 
        onClick={handleUpdate}
        disabled={updateMutation.isPending}
      >
        Update Policy
      </button>
    </div>
  )
}

// ============================================================================
// Example 8: Using Device Fingerprint with Login
// ============================================================================
async function loginWithMFA(email: string, password: string, rememberDevice: boolean) {
  const deviceFingerprint = getDeviceFingerprint()
  
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      deviceFingerprint,
      rememberDevice,
    }),
  })

  const data = await response.json()

  if (data.requiresMFA) {
    // Redirect to MFA challenge page
    window.location.href = `/auth/mfa/challenge?token=${data.challengeToken}`
  } else {
    // Normal login success
    localStorage.setItem('accessToken', data.accessToken)
    window.location.href = '/dashboard'
  }
}

export {
  MFAMethodsList,
  TOTPEnrollment,
  SMSEnrollment,
  DisableMFAButton,
  MFAChallengePage,
  GenerateRecoveryCodes,
  MFAPolicySettings,
  loginWithMFA,
}
