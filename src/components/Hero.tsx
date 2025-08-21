import { useState } from 'react'
import { Link } from 'react-router-dom'

const Hero: React.FC = () => {
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState('')
  const canJoin = name.trim().length > 0

  return (
    <div className="">
      <header className="py-4 bg-white sm:py-5">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between">
            <div className="flex shrink-0">
              <a href="#" title="" className="flex">
                <h1 className="text-2xl font-bold">
                  Pointify
                </h1>
              </a>
            </div>

            <div className="flex md:hidden">
              <button
                type="button"
                className="text-gray-900"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
              >
                {!expanded ? (
                  <svg className="w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                ) : (
                  <svg className="w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>

            <div className="hidden md:block">
              <a
                href="#"
                title=""
                className="inline-flex items-center justify-center px-6 py-2 sm:py-2.5 text-base font-semibold text-white transition-all duration-200 bg-gray-900 rounded-lg sm:text-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                role="button"
              >
                Join Email List
              </a>
            </div>
          </nav>

          {expanded && (
            <div className="px-1 pt-8 pb-4 md:hidden">
              <div className="grid gap-y-6">
                <a
                  href="#"
                  title=""
                  className="inline-flex items-center justify-center px-6 py-2 text-base font-semibold leading-7 text-white transition-all duration-200 bg-gray-900 border border-transparent rounded-lg hover:bg-gray-600 font-pj focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                  role="button"
                >
                  Join Email List
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      <section className="relative py-12 bg-white sm:py-16 lg:py-20">
        <div className="absolute inset-0">
          <img
            className="object-cover w-full h-full"
            src="https://landingfoliocom.imgix.net/store/collection/clarity-blog/images/hero/5/grid-pattern.png"
            alt=""
          />
        </div>

        <div className="relative px-4 mx-auto sm:px-6 lg:px-8 max-w-7xl">
          <div className="max-w-xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl lg:text-5xl">Estimate your Jira tickets.</h1>
            <p className="max-w-md mx-auto mt-6 text-base font-normal leading-7 text-gray-500">
              Pointify is a tool that helps developers to story point tickets.
            </p>

            <form method="POST" className="max-w-md mx-auto mt-8 space-y-4 sm:space-x-4 sm:flex sm:space-y-0 sm:items-end">
              <div className="flex-1">
                <label htmlFor="name" className="sr-only">
                  Name
                </label>
                <div>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    className="block w-full px-4 py-3 sm:py-3.5 text-base font-medium text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg sm:text-sm focus:ring-gray-900 focus:border-gray-900"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="relative group">
                <div className={canJoin ? "absolute transition-all duration-1000 opacity-70 inset-0 bg-gradient-to-r from-[#44BCFF] via-[#FF44EC] to-[#FF675E] rounded-xl blur-lg filter group-hover:opacity-100 group-hover:duration-200" : "absolute opacity-0 inset-0 rounded-xl"}></div>

                <Link
                  to="/pool"
                  onClick={(e) => {
                    if (!canJoin) {
                      e.preventDefault()
                      return
                    }
                    try {
                      localStorage.setItem('person', name.trim())
                    } catch {}
                  }}
                  aria-disabled={!canJoin}
                  tabIndex={canJoin ? 0 : -1}
                  className={
                    (canJoin
                      ? 'text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-600 '
                      : 'text-gray-400 bg-gray-200 cursor-not-allowed pointer-events-none focus:ring-0 ') +
                    'inline-flex relative items-center justify-center w-full sm:w-auto px-8 py-3 sm:text-sm text-base sm:py-3.5 font-semibold transition-all duration-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2'
                  }
                >
                  Join Pool
                </Link>
              </div>
            </form>

            <ul className="flex items-center justify-center mt-6 space-x-6 sm:space-x-8">
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-1 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs mr-35 font-medium text-gray-900 sm:text-sm">Join other teammates</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Hero