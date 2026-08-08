/**
 * Course list. Creating and reordering lessons happens in the course editor;
 * this page is the index and the delete confirmation.
 *
 * Editor/admin only, matching the "Staff manage courses" policy. The route
 * enforces it -- see the router.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteCourse, listCourses } from 'lib/cms/courses'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  LoadingBlock,
  Modal
} from 'components/admin/ui'
import { classNames } from 'utils'
import type { CourseRow } from 'types'

export default function AdminCoursesPage() {
  const navigate = useNavigate()

  const [rows, setRows] = useState<CourseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CourseRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listCourses())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load courses')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleDelete = async () => {
    if (!pendingDelete) return
    setBusyId(pendingDelete.id)
    try {
      await deleteCourse(pendingDelete.id)
      setPendingDelete(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete course')
      setPendingDelete(null)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="mt-1 text-sm text-gray-500">
            A course is a set of articles read in order. They appear on the home
            page and at /course/&lt;slug&gt;.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/admin/courses/new')}
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          New course
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <Card>
        {loading ? (
          <LoadingBlock label="Loading courses…" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No courses yet"
            description="Group a few related articles into a course and it will show up on the home page."
            action={
              <Button
                variant="primary"
                onClick={() => navigate('/admin/courses/new')}
              >
                New course
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((course) => (
              <li
                key={course.id}
                className={classNames(
                  'flex items-center justify-between gap-4 px-5 py-3.5',
                  busyId === course.id && 'opacity-50'
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {course.feature_image?.src ? (
                    <img
                      src={course.feature_image.src}
                      alt=""
                      className="size-10 shrink-0 rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden'
                      }}
                    />
                  ) : (
                    <div className="size-10 shrink-0 rounded-lg bg-gray-100" />
                  )}
                  <div className="min-w-0">
                    <Link
                      to={`/admin/courses/${course.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-brand-600"
                    >
                      {course.title}
                    </Link>
                    <p className="font-mono text-xs text-gray-400">
                      /course/{course.slug}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <span className="text-xs text-gray-500">
                    {course.lesson_count} lesson
                    {course.lesson_count === 1 ? '' : 's'}
                  </span>
                  <Link
                    to={`/admin/courses/${course.id}`}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(course)}
                    className="text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(pendingDelete)}
        title="Delete course"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={busyId === pendingDelete?.id}
            >
              Delete course
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Delete{' '}
          <strong className="text-gray-900">{pendingDelete?.title}</strong>?
          This removes the course and its running order. The{' '}
          {pendingDelete?.lesson_count ?? 0} article
          {pendingDelete?.lesson_count === 1 ? '' : 's'} in it are not touched.
        </p>
      </Modal>
    </div>
  )
}
