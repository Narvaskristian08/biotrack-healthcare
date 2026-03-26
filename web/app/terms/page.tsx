'use client'

const sections = [
  {
    title: 'Service Scope',
    body: 'BioTrack supports healthcare workflows and monitoring. It is not a substitute for emergency services or direct professional medical diagnosis.',
  },
  {
    title: 'Account Responsibility',
    body: 'Users are responsible for maintaining account security, providing accurate information, and using the platform according to applicable laws and policies.',
  },
  {
    title: 'Acceptable Use',
    body: 'Unauthorized access, misuse of patient information, and any abusive or disruptive use of the platform are prohibited.',
  },
  {
    title: 'Liability',
    body: 'To the extent permitted by law, platform owners and contributors are not liable for indirect or consequential damages arising from service misuse or interruptions.',
  },
]

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-6 md:p-8">
      <section className="rounded-2xl border border-[#c7e6d7] bg-linear-to-r from-[#effaf4] to-white px-6 py-5">
        <h1 className="text-3xl font-bold text-[#123527]">Terms of Service</h1>
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
