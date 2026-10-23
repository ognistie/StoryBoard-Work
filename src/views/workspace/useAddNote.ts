import { useReactFlow } from '@xyflow/react'
import { toastError } from '../../components/ui'
import { createNote } from '../../lib/repo'
import { useWD } from './context'

/** Drops a new sticky note in the middle of what is on screen, the same way the desktop "Nota" button does. */
export function useAddNote() {
  const { project, userId } = useWD()
  const { screenToFlowPosition } = useReactFlow()
  return async () => {
    try {
      const panel = document.querySelector('.react-flow')?.getBoundingClientRect()
      // A little scatter, so notes added in a row do not hide each other.
      const scatter = () => Math.round(Math.random() * 60 - 30)
      const at = panel ? screenToFlowPosition({ x: panel.left + panel.width / 2 - 84 + scatter(), y: panel.top + panel.height / 3 + scatter() }) : { x: 0, y: 0 }
      await createNote(project.id, userId, at)
    } catch (e) {
      toastError(e)
    }
  }
}
