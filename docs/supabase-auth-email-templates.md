# Supabase Auth Email Templates

Use this as the copy-paste source for branded Supabase Auth emails. These emails are sent by Supabase Auth, not by the app's normal Resend invoice email code.

## Recommended SMTP Settings

In Supabase, go to:

`Authentication` -> `Emails` -> `SMTP Settings`

Use the Resend SMTP settings:

| Field | Value |
| --- | --- |
| Sender name | `Sierra Invoices` |
| Sender email | `no-reply@sierraservices.ch` |
| SMTP host | `smtp.resend.com` |
| SMTP port | `587` |
| SMTP username | `resend` |
| SMTP password | Your Resend API key |

Do not commit the Resend API key anywhere. Paste it only into the Supabase dashboard.

Before using this in production, make sure the sender domain is verified in Resend and that SPF, DKIM, and DMARC are configured.

## Redirect URLs

In Supabase, go to:

`Authentication` -> `URL Configuration`

Make sure these redirect URLs are allowed:

```text
https://invoices.sierraservices.ch/reset-password
http://localhost:3000/reset-password
```

The production URL is what users need. The localhost URL is only for local testing.

## Reset Password

In Supabase, go to:

`Authentication` -> `Email Templates` -> `Reset Password`

Subject:

```text
Reset your Sierra Invoices password
```

Body:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset your Sierra Invoices password</title>
  </head>
  <body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;margin:0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px 28px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:44px;height:44px;background:#020617;border-radius:12px;text-align:center;vertical-align:middle;">
                      <div style="font-size:16px;line-height:44px;font-weight:700;color:#ffffff;">SI</div>
                    </td>
                    <td style="padding-left:14px;">
                      <div style="font-size:18px;line-height:24px;font-weight:700;color:#0f172a;">Sierra Invoices</div>
                      <div style="font-size:13px;line-height:18px;color:#64748b;">Account security</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 28px 30px 28px;">
                <h1 style="margin:0 0 12px 0;font-size:24px;line-height:32px;color:#0f172a;">Reset your password</h1>
                <p style="margin:0 0 18px 0;font-size:15px;line-height:24px;color:#334155;">
                  We received a request to reset the password for your Sierra Invoices account.
                </p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:24px;color:#334155;">
                  Use the secure button below to choose a new password.
                </p>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                  <tr>
                    <td style="border-radius:10px;background:#020617;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="display:inline-block;padding:13px 18px;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;"
                      >
                        Reset password
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 12px 0;font-size:13px;line-height:21px;color:#64748b;">
                  If the button does not work, copy and paste this link into your browser:
                </p>
                <p style="margin:0 0 22px 0;font-size:13px;line-height:20px;word-break:break-all;color:#475569;">
                  <a href="{{ .ConfirmationURL }}" style="color:#0f172a;text-decoration:underline;">{{ .ConfirmationURL }}</a>
                </p>

                <div style="border-top:1px solid #e2e8f0;padding-top:18px;">
                  <p style="margin:0;font-size:13px;line-height:21px;color:#64748b;">
                    If you did not request this reset, you can ignore this email. Your current password will stay unchanged.
                  </p>
                </div>
              </td>
            </tr>
          </table>

          <p style="max-width:560px;margin:16px auto 0 auto;font-size:12px;line-height:18px;color:#94a3b8;text-align:center;">
            Sierra Invoices sends this email to help protect your account.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Optional: Confirmation Email

If signup confirmation emails are enabled, update that template too so new users do not see Supabase branding.

Subject:

```text
Confirm your Sierra Invoices account
```

Use the same structure as the reset email, but change the main text to:

```html
<h1 style="margin:0 0 12px 0;font-size:24px;line-height:32px;color:#0f172a;">Confirm your email address</h1>
<p style="margin:0 0 24px 0;font-size:15px;line-height:24px;color:#334155;">
  Confirm your email address to finish setting up your Sierra Invoices account.
</p>
```

And change the button text to:

```text
Confirm email
```

Keep the button link as:

```html
{{ .ConfirmationURL }}
```

## References

- Supabase custom SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase email templates: https://supabase.com/docs/guides/auth/auth-email-templates
- Resend SMTP settings: https://resend.com/docs/send-with-smtp
