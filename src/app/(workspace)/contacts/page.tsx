import { PageHeader } from '@/components/app-shell';
import { requirePageAccess } from '@/server/policy/page-access';
import { listContacts } from '@/server/queries/marketplace';
export default async function ContactsPage() {
  const principal = await requirePageAccess('BUYER', 'SELLER');
  const contacts = await listContacts(principal);
  return (
    <>
      <PageHeader title="Inquiries" eyebrow="Marketplace / communication" />
      <div className="stack">
        {contacts.map((contact) => (
          <article className="contact-card" key={contact.id}>
            <div>
              <span className="tag">
                {contact.sender.id === principal.userId ? 'Sent' : 'Received'}
              </span>
              <h2>{contact.subject}</h2>
              <p>{contact.message}</p>
            </div>
            <small>
              {contact.sender.organization} → {contact.recipient.organization}
              {contact.asset ? ` · ${contact.asset.title}` : ''}
            </small>
          </article>
        ))}
        {contacts.length === 0 && <div className="empty">No inquiries yet.</div>}
      </div>
    </>
  );
}
