import React from 'react';
import { ClinicalEvent } from 'cbioportal-ts-api-client';
import { groupTimelineData } from 'pages/patientView/timeline2/timelineDataUtils.ts';
import LazyMobXTable from 'shared/components/lazyMobXTable/LazyMobXTable';
import _ from 'lodash';
import parse from 'html-react-parser';

class EventsTable extends LazyMobXTable<{}> {}

function makeColumns(data: string[][]) {
    return data[0].map((item, i: number) => {
        return {
            name: item,
            render: (data: string[]) => <span>{parse(data[i])}</span>,
            download: (data: string[]) => data[i],
            sortBy: (data: string[]) => data[i],
            filter: (
                txt: string,
                filterString: string,
                filterStringUpper: string
            ) => txt.toUpperCase().includes(filterStringUpper),
        };
    });
}

const ClinicalEventsTables: React.FunctionComponent<{
    clinicalEvents: ClinicalEvent[];
}> = function({ clinicalEvents }) {
    const data = groupTimelineData(clinicalEvents);

    return (
        <div>
            {_.map(data, (dataCategory: string[][], key: string) => {
                // remove PATIENT_ID column since it is redundant
                const hiddenColumnIndex = dataCategory[0].reduce(
                    (aggr: number[], item: string, i) => {
                        if (['PATIENT_ID'].includes(item)) {
                            aggr.push(i);
                        }
                        return aggr;
                    },
                    []
                );

                const cleanedDataCategory = dataCategory.map((row, i) => {
                    return row
                        .filter((item, i) => {
                            return !hiddenColumnIndex.includes(i);
                        })
                        .map(item => {
                            const search = [
                                'Ã¤',
                                'Ã¼',
                                'Ã¶',
                                'Ã„',
                                'Ã–',
                                'Ãœ',
                                'ÃŸ',
                            ];
                            const replace = ['ä', 'ü', 'ö', 'Ä', 'Ö', 'Ü', 'ß'];
                            let regex;
                            for (let i = 0; i < search.length; i++) {
                                regex = new RegExp(search[i], 'g');
                                item = item.replace(regex, replace[i]);
                            }
                            return item;
                        });
                });

                return (
                    <>
                        <h3
                            className={'pull-left'}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {key.toLowerCase()}
                        </h3>
                        <EventsTable
                            data={cleanedDataCategory.slice(1)}
                            columns={makeColumns(cleanedDataCategory)}
                            showPagination={false}
                            showColumnVisibility={false}
                            showFilter={true}
                            showCopyDownload={true}
                        />
                    </>
                );
            })}
        </div>
    );
};

export default ClinicalEventsTables;
