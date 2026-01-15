import { DigestSendSchema, type DigestSendResult } from '@esg/core'
import { Resend } from 'resend'
import { buildDigest } from '../../utils/digest'

export default defineEventHandler(async (event): Promise<DigestSendResult> => {
  const body = await readBody(event)
  const result = DigestSendSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid send request',
      data: result.error.flatten()
    })
  }

  const config = useRuntimeConfig()

  if (!config.resendApiKey) {
    throw createError({
      statusCode: 500,
      message: 'Resend API key is not configured'
    })
  }

  if (!config.resendFromEmail) {
    throw createError({
      statusCode: 500,
      message: 'Resend from address is not configured'
    })
  }

  const { startIso, endIso, to, subject } = result.data
  const digest = await buildDigest(new Date(startIso), new Date(endIso))

  const resend = new Resend(config.resendApiKey)
  const subjectLine = subject || `ESG News Digest — ${digest.stats.dateRange}`

  const { data, error } = await resend.emails.send({
    from: config.resendFromEmail,
    to,
    subject: subjectLine,
    html: digest.html,
    text: digest.text
  })

  if (error) {
    throw createError({
      statusCode: 502,
      message: 'Failed to send digest email',
      data: error
    })
  }

  return {
    success: true,
    id: data?.id ?? null,
    stats: digest.stats
  }
})
