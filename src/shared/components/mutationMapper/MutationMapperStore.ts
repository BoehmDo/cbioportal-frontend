import autobind from 'autobind-decorator';
import { computed, makeObservable } from 'mobx';
import MobxPromise, { cached } from 'mobxpromise';
import memoize from 'memoize-weak-decorator';

import {
    applyDataFilters,
    DataFilterType,
    DefaultMutationMapperDataFetcher,
    groupDataByProteinImpactType,
    groupOncoKbIndicatorDataByMutations,
    DefaultMutationMapperStore,
    ONCOKB_DEFAULT_INFO,
    ApplyFilterFn,
} from 'react-mutation-mapper';
import {
    defaultOncoKbIndicatorFilter,
    IHotspotIndex,
    getMutationsByTranscriptId,
} from 'cbioportal-utils';
import { remoteData } from 'cbioportal-frontend-commons';
import { Gene, Mutation } from 'cbioportal-ts-api-client';
import {
    VariantAnnotation,
    GenomeNexusAPI,
    GenomeNexusAPIInternal,
} from 'genome-nexus-ts-api-client';
import { CancerGene, OncoKBInfo } from 'oncokb-ts-api-client';

import defaultGenomeNexusClient from 'shared/api/genomeNexusClientInstance';
import defaultInternalGenomeNexusClient from 'shared/api/genomeNexusInternalClientInstance';
import oncoKBClient from 'shared/api/oncokbClientInstance';
import ResidueMappingCache from 'shared/cache/ResidueMappingCache';
import {
    fetchPdbAlignmentData,
    indexPdbAlignmentData,
} from 'shared/lib/StoreUtils';
import { IPdbChain, PdbAlignmentIndex } from 'shared/model/Pdb';
import {
    calcPdbIdNumericalValue,
    mergeIndexedPdbAlignments,
    PDB_IGNORELIST,
} from 'shared/lib/PdbUtils';
import { lazyMobXTableSort } from 'shared/components/lazyMobXTable/LazyMobXTable';
import { MutationTableDownloadDataFetcher } from 'shared/lib/MutationTableDownloadDataFetcher';
import {
    groupMutationsByProteinStartPos,
    countUniqueMutations,
} from 'shared/lib/MutationUtils';
import PdbChainDataStore from './PdbChainDataStore';
import MutationMapperDataStore from './MutationMapperDataStore';
import { IMutationMapperConfig } from './MutationMapperConfig';
import {
    buildNamespaceColumnConfig,
    normalizeMutations,
} from './MutationMapperUtils';
import { getOncoKbApiUrl } from 'shared/api/urls';
import { NamespaceColumnConfig } from 'shared/components/mutationTable/MutationTable';

export interface IMutationMapperStoreConfig {
    filterMutationsBySelectedTranscript?: boolean;
    filterAppliersOverride?: { [filterType: string]: ApplyFilterFn };
}

export default class MutationMapperStore extends DefaultMutationMapperStore<
    Mutation
> {
    constructor(
        protected mutationMapperConfig: IMutationMapperConfig,
        protected mutationMapperStoreConfig: IMutationMapperStoreConfig,
        public gene: Gene,
        protected getMutations: () => Mutation[],
        // TODO: we could merge indexedVariantAnnotations and indexedHotspotData
        public indexedHotspotData: MobxPromise<IHotspotIndex | undefined>,
        public indexedVariantAnnotations: MobxPromise<
            { [genomicLocation: string]: VariantAnnotation } | undefined
        >,
        public oncoKbCancerGenes: MobxPromise<CancerGene[] | Error>,
        public uniqueSampleKeyToTumorType: {
            [uniqueSampleKey: string]: string;
        },
        protected genomenexusClient?: GenomeNexusAPI,
        protected genomenexusInternalClient?: GenomeNexusAPIInternal,
        public getTranscriptId?: () => string
    ) {
        super(
            gene,
            {
                isoformOverrideSource:
                    mutationMapperConfig.isoformOverrideSource,
                ptmSources: mutationMapperConfig.ptmSources,
                filterMutationsBySelectedTranscript:
                    mutationMapperStoreConfig.filterMutationsBySelectedTranscript,
                enableCivic: mutationMapperConfig.show_civic,
                enableOncoKb: mutationMapperConfig.show_oncokb,
                filterAppliersOverride:
                    mutationMapperStoreConfig.filterAppliersOverride,
            },
            getMutations,
            getTranscriptId
        );

        makeObservable(this);

        const unnormalizedGetMutations = this.getMutations;
        this.getMutations = () =>
            normalizeMutations(unnormalizedGetMutations());
        //labelMobxPromises(this);
    }

    protected getDataFetcher = () => {
        return new DefaultMutationMapperDataFetcher(
            {
                myGeneUrlTemplate:
                    this.mutationMapperConfig.mygene_info_url || undefined,
                uniprotIdUrlTemplate:
                    this.mutationMapperConfig.uniprot_id_url || undefined,
                genomeNexusUrl:
                    this.mutationMapperConfig.genomenexus_url || undefined,
                oncoKbUrl: getOncoKbApiUrl() || undefined,
            },
            this.genomenexusClient || defaultGenomeNexusClient,
            this.genomenexusInternalClient || defaultInternalGenomeNexusClient,
            oncoKBClient
        );
    };

    @memoize
    protected getAnnotatedMutationsByTranscriptId(
        mutations: Mutation[],
        transcriptId: string,
        indexedVariantAnnotations: {
            [genomicLocation: string]: VariantAnnotation;
        }
    ) {
        // overriding the base method (DefaultMutationMapperStore.getAnnotatedMutationsByTranscriptId)
        // to skip annotating mutations for canonical transcript.
        // we want to use the values from database for canonical transcript
        return getMutationsByTranscriptId(
            mutations,
            transcriptId,
            indexedVariantAnnotations,
            this.canonicalTranscript.result
                ? this.canonicalTranscript.result!.transcriptId === transcriptId
                : false,
            true
        );
    }

    readonly oncoKbInfo: MobxPromise<OncoKBInfo> = remoteData(
        {
            invoke: () => this.dataFetcher.fetchOncoKbInfo(),
            onError: () => ONCOKB_DEFAULT_INFO,
        },
        ONCOKB_DEFAULT_INFO
    );

    readonly mutationData = remoteData(
        {
            await: () => {
                if (
                    this.mutationMapperStoreConfig
                        .filterMutationsBySelectedTranscript
                ) {
                    return [
                        this.canonicalTranscript,
                        this.indexedVariantAnnotations,
                    ];
                } else {
                    return [this.canonicalTranscript];
                }
            },
            invoke: async () => {
                return this.mutations as Mutation[];
            },
        },
        []
    );

    readonly alignmentData = remoteData(
        {
            await: () => [this.mutationData, this.activeTranscript],
            invoke: async () => {
                if (this.activeTranscript.result) {
                    return fetchPdbAlignmentData(this.activeTranscript.result);
                } else {
                    return [];
                }
            },
            onError: () => {
                // fail silently
            },
        },
        []
    );

    @computed get namespaceColumnConfig(): NamespaceColumnConfig {
        return buildNamespaceColumnConfig(this.mutationData.result);
    }

    public countUniqueMutations(mutations: Mutation[]): number {
        return countUniqueMutations(mutations);
    }

    @autobind
    protected getDefaultTumorType(mutation: Mutation): string {
        return this.uniqueSampleKeyToTumorType[mutation.uniqueSampleKey];
    }

    @autobind
    protected getDefaultEntrezGeneId(mutation: Mutation): number {
        return mutation.gene.entrezGeneId;
    }

    // TODO remove when done refactoring react-mutation-mapper
    @computed get unfilteredMutationsByPosition(): {
        [pos: number]: Mutation[];
    } {
        return groupMutationsByProteinStartPos(
            (this.dataStore as MutationMapperDataStore).sortedData
        );
    }

    // TODO remove when done refactoring react-mutation-mapper
    @computed get oncoKbDataByProteinPosStart() {
        if (
            this.oncoKbData.result &&
            !(this.oncoKbData.result instanceof Error)
        ) {
            return groupOncoKbIndicatorDataByMutations(
                this.unfilteredMutationsByPosition,
                this.oncoKbData.result,
                this.getDefaultTumorType,
                this.getDefaultEntrezGeneId,
                defaultOncoKbIndicatorFilter
            );
        } else {
            return {};
        }
    }

    protected getMutationsGroupedByProteinImpactType = () => {
        const filtersWithoutProteinImpactTypeFilter = this.dataStore.dataFilters.filter(
            f => f.type !== DataFilterType.PROTEIN_IMPACT_TYPE
        );

        // apply filters excluding the protein impact type filters
        // this prevents number of unchecked protein impact types from being counted as zero
        let sortedFilteredData = applyDataFilters(
            this.dataStore.allData,
            filtersWithoutProteinImpactTypeFilter,
            this.dataStore.applyFilter
        );

        // also apply lazy mobx table search filter
        sortedFilteredData = sortedFilteredData.filter(m =>
            (this
                .dataStore as MutationMapperDataStore).applyLazyMobXTableFilter(
                m
            )
        );

        return groupDataByProteinImpactType(sortedFilteredData);
    };

    @computed get processedMutationData(): Mutation[][] {
        // just convert Mutation[] to Mutation[][]
        return (this.mutationData.result || []).map(mutation => [mutation]);
    }

    @computed get mergedAlignmentData(): IPdbChain[] {
        return mergeIndexedPdbAlignments(this.indexedAlignmentData);
    }

    @computed get indexedAlignmentData(): PdbAlignmentIndex {
        return indexPdbAlignmentData(this.alignmentData);
    }

    @computed get sortedMergedAlignmentData(): IPdbChain[] {
        const sortMetric = (pdbChain: IPdbChain) => [
            pdbChain.identity, // first, sort by identity
            pdbChain.alignment.length, // then by alignment length
            pdbChain.identityPerc, // then by identity percentage
            // current sort metric cannot handle mixed values so generating numerical values for strings
            ...calcPdbIdNumericalValue(pdbChain.pdbId, true), // then by pdb id (A-Z): always returns an array of size 4
            -1 * pdbChain.chain.charCodeAt(0), // then by chain id (A-Z): chain id is always one char
        ];

        return lazyMobXTableSort(this.mergedAlignmentData, sortMetric, false);
    }

    @computed get numberOfMutationsTotal(): number {
        // number of mutations regardless of transcript
        return this.getMutations().length;
    }

    protected getDataStore: () => MutationMapperDataStore = () => {
        return new MutationMapperDataStore(
            this.processedMutationData,
            this.filterApplier,
            this.config.dataFilters,
            this.config.selectionFilters,
            this.config.highlightFilters,
            this.config.groupFilters
        );
    };

    protected getDownloadDataFetcher() {
        return new MutationTableDownloadDataFetcher(this.mutationData);
    }

    @cached
    @computed
    get downloadDataFetcher(): MutationTableDownloadDataFetcher {
        return this.getDownloadDataFetcher();
    }

    @cached @computed get pdbChainDataStore(): PdbChainDataStore {
        // initialize with sorted merged alignment data
        return new PdbChainDataStore(
            this.sortedMergedAlignmentData.filter(
                // TODO temporary workaround for problematic pdb structures
                chain => !PDB_IGNORELIST.includes(chain.pdbId.toLowerCase())
            )
        );
    }

    @cached @computed get residueMappingCache() {
        return new ResidueMappingCache();
    }
}
