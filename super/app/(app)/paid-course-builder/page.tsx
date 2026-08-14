import { redirect } from 'next/navigation';

/** Route alias — keeps /bootcamps backward compatible. */
export default function PaidCourseBuilderAliasPage() {
  redirect('/bootcamps');
}
