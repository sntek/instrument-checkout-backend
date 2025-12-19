import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
      <h2 className="text-2xl font-bold mb-4">Not Found</h2>
      <p className="mb-4">Could not find requested resource</p>
      <Link href="/" className="text-blue-400 hover:text-blue-300">
        Return Home
      </Link>
    </div>
  )
}
