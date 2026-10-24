import { invitesRequest, ROLE_LABEL, type Invite } from '../src/lib/collab/contract.js'
import { requireUser } from '../src/server/auth.js'
import { endpoint, json, rateLimit, readJSON } from '../src/server/http.js'
import { requireKV } from '../src/server/kv.js'
import { acceptInvite, createInvite, declineInvite } from '../src/server/projects.js'

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/**
 * Emails the invite link when RESEND_API_KEY is set. Without it the app shows the link to copy,
 * and the invite also waits in the invitee's "Compartilhados comigo" after they sign in.
 */
async function sendInviteEmail(invite: Invite, link: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  const from = process.env.INVITE_FROM_EMAIL || 'Decupa <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [invite.email],
      subject: `${invite.invitedByName} convidou você para “${invite.projectName}” no Decupa`,
      html: [
        `<p>${escapeHtml(invite.invitedByName)} convidou você para o projeto <strong>${escapeHtml(invite.projectName)}</strong> no Decupa, com papel de ${ROLE_LABEL[invite.role]}.</p>`,
        `<p><a href="${escapeHtml(link)}">Abrir o convite</a></p>`,
        `<p>Entre com este e-mail (${escapeHtml(invite.email)}) para aceitar. O convite vale 14 dias.</p>`,
      ].join(''),
    }),
  }).catch(() => null)
  return !!res?.ok
}

export const POST = endpoint(async (request) => {
  const kv = requireKV()
  const user = await requireUser(kv, request)
  const body = await readJSON(request, invitesRequest)
  if (body.action === 'create') {
    await rateLimit(`invite:${user.id}`, 40, 3600, kv)
    const invite = await createInvite(kv, user, body)
    const link = `${new URL(request.url).origin}/#/convite/${invite.token}`
    return json({ invite, emailed: await sendInviteEmail(invite, link) })
  }
  if (body.action === 'accept') return json({ project: await acceptInvite(kv, user, body.token) })
  await declineInvite(kv, user, body.token)
  return json({ ok: true })
})
