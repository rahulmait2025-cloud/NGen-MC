import { Metadata } from 'next';
import { ComingSoonCorporate } from './ComingSoon';

export const metadata: Metadata = {
    title: 'Corporate Track - NextGen CTO',
    description: 'Master system design, scalable architecture, and strategic career skills to crack elite product companies.',
};

export default function CorporatePage() {
    return (
        <>
            <ComingSoonCorporate />
            {/* <CorporateLanding /> */}
        </>
    );
}
