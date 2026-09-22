import Reviewer from '@/components/Reviewer';
import { companies, companyUrlSlug } from '@/app/data/companies';

/**
 * Required by `output: 'export'`: a dynamic segment with no static params is a
 * hard build failure, not a warning. One entry today, from the companies list.
 */
export function generateStaticParams() {
  return companies.map((c) => ({ name: companyUrlSlug(c) }));
}

/**
 * The DRHP reviewer, rendered edge-to-edge.
 *
 * `investigation-surface` exists only to retarget `.shell { height: 100vh }`
 * from app/globals.css to 100% — inside the shell the reviewer sits below a
 * 56px top bar, so 100vh would overflow by exactly that much. The override
 * lives in app/tailwind.css so globals.css stays byte-identical.
 */
export default function Page() {
  return (
    <div className="investigation-surface h-full min-h-0">
      <Reviewer />
    </div>
  );
}
