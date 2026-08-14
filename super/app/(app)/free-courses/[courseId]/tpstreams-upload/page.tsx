import type { ReactNode } from 'react';

import type { Metadata } from 'next';

import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';

import { getFreeCourseBuilder } from '@/lib/free-courses/free-course-service';

import { ensureFreeCourseTpFolders } from '@/lib/free-courses/free-course-tpstreams';

import { listVideoAssetsByCourse } from '@/lib/services/video-assets';

import { FreeCourseTpstreamsUploadClient } from './free-course-tpstreams-upload-client';



export const metadata: Metadata = {

  title: 'Add Premium Lectures',

  description: 'Upload TPStreams premium lectures to a free course',

};



interface PageProps {

  params: Promise<{ courseId: string }>;

}



export default async function FreeCourseTpstreamsUploadPage({

  params,

}: PageProps): Promise<ReactNode> {

  const _auth = await getSessionFromHeaders();

  if (!_auth) {

    const { redirect } = await import('next/navigation');

    redirect('/login');

  }



  const { courseId } = await params;

  const [builder, videoAssets] = await Promise.all([

    getFreeCourseBuilder(courseId),

    listVideoAssetsByCourse(courseId, { include_removed: false }),

  ]);



  const modules = builder.modules ?? [];

  let tpFolderUuid = builder.course.tp_folder_uuid ?? null;

  let tpFolderProvisionError: string | null = null;



  if (modules.length > 0) {

    try {

      const ensured = await ensureFreeCourseTpFolders(courseId);

      tpFolderUuid = ensured.tp_folder_uuid ?? tpFolderUuid;

    } catch (e) {

      tpFolderProvisionError =

        e instanceof Error

          ? e.message

          : 'Free course TPStreams folder could not be created.';

    }

  }



  return (

    <FreeCourseTpstreamsUploadClient

      courseId={courseId}

      courseTitle={builder.course.title}

      courseCode={builder.course.code}

      tpFolderUuid={tpFolderUuid}

      tpFolderProvisionError={tpFolderProvisionError}

      modules={modules}

      initialVideoAssets={videoAssets ?? []}

    />

  );

}

