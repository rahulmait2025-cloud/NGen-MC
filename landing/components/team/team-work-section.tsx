const PRINCIPLES = [
  {
    number: '01',
    title: 'Students First',
    body: 'We solve real student problems rather than building features only for a checklist.',
  },
  {
    number: '02',
    title: 'Ship, Learn, Improve',
    body: 'Useful progress is better than endless internal perfection.',
  },
  {
    number: '03',
    title: 'Explain Everything',
    body: 'If students cannot understand it, we simplify it.',
  },
  {
    number: '04',
    title: 'High Standards, Low Drama',
    body: 'Serious work without unnecessary corporate behaviour.',
  },
] as const;

const STICKY_NOTES = [
  { text: 'Deploying to prod', className: 'left-6 top-8 -rotate-6 bg-[#fbcfe8]' },
  { text: 'Reply to students', className: 'right-4 top-24 rotate-3 bg-[#bbf7d0]' },
  { text: 'Review before deploy', className: 'bottom-10 left-10 -rotate-12 bg-[#bae6fd]' },
  { text: 'Why did this work locally?', className: 'bottom-16 right-8 rotate-6 bg-[#fde68a]' },
] as const;

export function TeamWorkSection() {
  return (
    <section className="grid grid-cols-1 border-b border-[#111111] bg-white lg:grid-cols-2">
      <div className="border-b border-[#111111] p-5 md:p-16 lg:border-b-0 lg:border-r">
        <h2 className="font-display text-2xl font-bold tracking-tight text-[#111111] md:text-4xl">
          How we work when nobody is watching
        </h2>
        <ul className="mt-10 border-t border-[#111111]">
          {PRINCIPLES.map((item) => (
            <li
              key={item.number}
              className="flex gap-5 border-b border-[#111111] py-6 transition-[padding] duration-200 hover:pl-2 motion-reduce:transition-none"
            >
              <span className="font-display text-sm font-bold text-[#ff5f36]">{item.number}</span>
              <div>
                <h3 className="font-display text-lg font-bold text-[#111111] md:text-xl">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#555555] md:text-base">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p
          className="mt-8 inline-block max-w-sm -rotate-1 border border-[#111111] bg-[#f7f6f2] px-4 py-3 text-sm font-semibold italic text-[#111111]"
          aria-hidden="true"
        >
          Meetings that could have been messages are under investigation.
        </p>
      </div>

      <div className="relative flex min-h-[22rem] items-center justify-center p-5 md:min-h-[26rem] md:p-16">
        <p className="absolute left-5 top-5 border border-[#111111] bg-white px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.12em] text-[#111111] md:left-16 md:top-10">
          Status Board
        </p>
        <div
          className="relative aspect-square w-full max-w-md rotate-1 border-2 border-[#111111] bg-[#fef9c3] p-6 shadow-[8px_8px_0_0_#111111] motion-reduce:rotate-0"
          aria-hidden="true"
        >
          {STICKY_NOTES.map((note) => (
            <div
              key={note.text}
              className={`absolute flex h-24 w-28 items-center justify-center border border-[#111111] p-2 text-center text-xs font-semibold italic leading-snug text-[#111111] md:h-28 md:w-32 md:text-sm ${note.className}`}
            >
              {note.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TeamBehindTheScenes() {
  return (
    <section className="border-b border-[#111111] bg-white px-5 py-10 md:px-16">
      <div className="mx-auto max-w-4xl text-center">
        <p className="font-display text-lg font-semibold leading-relaxed text-[#555555] md:text-xl">
          Someone is deploying. Someone is fixing the deployment. Someone is asking why it worked locally.
        </p>
      </div>
    </section>
  );
}
