'use client';

import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCtaClick } from '@/lib/analytics/track';

export function HeroPrimaryCta() {
    return (
        <Button asChild size='lg' className='w-full sm:w-auto text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 rounded-xl shadow-xl shadow-primary/25 cursor-pointer'>
            <Link
                href='/contact'
                onClick={() =>
                    trackCtaClick({
                        cta_name: 'hero_primary',
                        cta_location: 'hero',
                        page_name: 'home',
                        current_path: '/',
                    })
                }
            >
                <GraduationCap className='mr-2 h-5 w-5' />
                <span className='sm:hidden'>Get Started</span>
                <span className='hidden sm:inline'>Bring NextGen to My Campus</span>
            </Link>
        </Button>
    );
}
