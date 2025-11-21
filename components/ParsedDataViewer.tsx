import React from 'react';
import { ParsedEmailData } from '../types';

interface DataRowProps {
  label: string;
  children: React.ReactNode;
}

const DataRow: React.FC<DataRowProps> = ({ label, children }) => (
    <div className="py-3 border-b border-brand-light">
        <dt className="text-sm font-semibold text-brand-subtext uppercase tracking-wider">{label}</dt>
        <dd className="mt-1 text-brand-text">{children}</dd>
    </div>
);

const HtmlContent: React.FC<{ content: string }> = ({ content }) => (
    <div 
        className="prose prose-invert prose-sm max-w-none bg-brand-dark/50 p-3 rounded-md mt-2" 
        dangerouslySetInnerHTML={{ __html: content }} 
    />
);

const ParsedDataViewer: React.FC<{ data: ParsedEmailData }> = ({ data }) => {
    return (
        <div className="bg-brand-medium rounded-lg shadow-2xl p-6 border-4 border-brand-light flex flex-col h-full">
            <h3 className="text-xl font-bold text-white mb-4 flex-shrink-0">Extracted Email Content</h3>
            <div className="overflow-y-auto pr-2">
                <dl>
                    <DataRow label="Subject">
                        <p className="font-bold">{data.subject}</p>
                    </DataRow>
                    <DataRow label="Header Brand">{data.headerBrand}</DataRow>
                    <DataRow label="Header Course Name">{data.headerCourseName}</DataRow>
                    <DataRow label="Header Title">{data.headerTitle}</DataRow>
                    <DataRow label="Header Subtitle">{data.headerSubtitle}</DataRow>
                    <DataRow label="Greeting">
                       <HtmlContent content={data.greeting} />
                    </DataRow>
                    <DataRow label="Introduction">
                        <HtmlContent content={data.introduction} />
                    </DataRow>
                    <DataRow label="Main Content">
                        <HtmlContent content={data.mainContent} />
                    </DataRow>
                    {data.actionStep && (
                        <DataRow label="Action Step">
                            <div className="bg-brand-dark/50 p-3 rounded-md mt-2 space-y-2">
                                <p className="font-semibold text-amber-400">{data.actionStep.heading}</p>
                                <div dangerouslySetInnerHTML={{ __html: data.actionStep.text }} />
                                {data.actionStep.buttonText && (
                                    <p className="text-sm">
                                        <span className="font-semibold text-brand-subtext">Button:</span> "{data.actionStep.buttonText}"
                                    </p>
                                )}
                            </div>
                        </DataRow>
                    )}
                    <DataRow label="Closing">
                        <HtmlContent content={data.closing} />
                    </DataRow>
                    {data.ps && (
                        <DataRow label="P.S.">
                            <HtmlContent content={data.ps} />
                        </DataRow>
                    )}
                </dl>
            </div>
        </div>
    );
};

export default ParsedDataViewer;
