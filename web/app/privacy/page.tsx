'use client'

const sections = [
  {
    title: 'Data We Collect',
    body: 'We collect only the information needed to provide healthcare services, including account details, patient profile data, and consented health records.',
  },
  {
    title: 'How Data Is Used',
    body: 'Your data is used for account access, patient monitoring, record review, and care coordination among authorized healthcare professionals.',
  },
  {
    title: 'Security and Protection',
    body: 'We implement role-based access controls, encrypted transport, secure storage, and audit logs to safeguard patient information.',
  },
  {
    title: 'Data Sharing',
    body: 'We do not sell personal data. Information is shared only with authorized care teams, system administrators, or when legally required.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-6 md:p-8">
      <section className="rounded-2xl border border-[#c7e6d7] bg-linear-to-r from-[#effaf4] to-white px-6 py-5">
        <h1 className="text-3xl font-bold text-[#123527]">Privacy Policy</h1>
        <p className="mt-1 text-sm text-[#5a766c]">Last updated: February 16, 2026</p>
      </section>

      {sections.map((section) => (
        <section key={section.title} className="rounded-xl border border-[#d9ede2] bg-white px-5 py-4">
          <h2 className="text-base font-semibold text-[#163f30]">{section.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#4f6f63]">{section.body}</p>
        </section>
      ))}
    </div>
  )
}
