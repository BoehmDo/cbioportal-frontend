import * as React from 'react';
import * as _ from 'lodash';
import { Modal, Button } from 'react-bootstrap';
import {
    ITherapyRecommendation,
    EvidenceLevel,
} from 'shared/model/TherapyRecommendation';
import { TherapyRecommendationFormAlterationPositiveInput } from './TherapyRecommendationFormAlterationInput';
import {
    Mutation,
    ClinicalData,
    DiscreteCopyNumberData,
} from 'cbioportal-ts-api-client';
import TherapyRecommendationFormDrugInput from './TherapyRecommendationFormDrugInput';
import TherapyRecommendationFormClinicalInput from './TherapyRecommendationFormClinicalInput';
import Select from 'react-select';
import TherapyRecommendationFormReferenceInput from './TherapyRecommendationFormReferenceInput';
import TherapyRecommendationFormCommentInput from './TherapyRecommendationFormCommentInput';
import TherapyRecommendationFormEvidenceLevelInput from './TherapyRecommendationFormEvidenceLevelInput';
import { VariantAnnotation } from 'genome-nexus-ts-api-client';

interface ITherapyRecommendationFormProps {
    show: boolean;
    data: ITherapyRecommendation;
    mutations: Mutation[];
    indexedVariantAnnotations:
        | { [genomicLocation: string]: VariantAnnotation }
        | undefined;
    cna: DiscreteCopyNumberData[];
    clinicalData: ClinicalData[];
    title: string;
    userEmailAddress: string;
    onHide: (newTherapyRecommendation?: ITherapyRecommendation) => void;
}

export default class TherapyRecommendationForm extends React.Component<
    ITherapyRecommendationFormProps,
    {}
> {
    public render() {
        let therapyRecommendation: ITherapyRecommendation = Object.create(
            this.props.data
        );
        return (
            <Modal
                show={this.props.show}
                onHide={() => {
                    this.props.onHide(undefined);
                }}
                backdrop={'static'}
            >
                <Modal.Header closeButton>
                    <Modal.Title>{this.props.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form className="form">
                        <div className="form-group">
                            <h5>Reasoning:</h5>
                            <h6>Genomic alterations:</h6>
                            <TherapyRecommendationFormAlterationPositiveInput
                                data={therapyRecommendation}
                                mutations={this.props.mutations}
                                indexedVariantAnnotations={
                                    this.props.indexedVariantAnnotations
                                }
                                cna={this.props.cna}
                                onChange={alterations =>
                                    (therapyRecommendation.reasoning.geneticAlterations = alterations)
                                }
                            />
                            <h6>Clinical data:</h6>
                            <TherapyRecommendationFormClinicalInput
                                data={therapyRecommendation}
                                clinicalData={this.props.clinicalData}
                                onChange={clinicalDataItems =>
                                    (therapyRecommendation.reasoning.clinicalData = clinicalDataItems)
                                }
                            />
                        </div>

                        <div className="form-group">
                            <h5>Drug(s):</h5>
                            <TherapyRecommendationFormDrugInput
                                data={therapyRecommendation}
                                onChange={drugs =>
                                    (therapyRecommendation.treatments = drugs)
                                }
                            />
                        </div>

                        <div className="form-group">
                            <h5>Comment:</h5>
                            <TherapyRecommendationFormCommentInput
                                data={therapyRecommendation}
                                onChange={comments =>
                                    (therapyRecommendation.comment = comments)
                                }
                            />
                        </div>

                        <div className="form-group">
                            <h5>Evidence Level:</h5>
                            <TherapyRecommendationFormEvidenceLevelInput
                                data={therapyRecommendation}
                                onChange={evidenceLevel =>
                                    (therapyRecommendation.evidenceLevel = evidenceLevel)
                                }
                            />
                        </div>

                        <div className="form-group">
                            <h5>Reference(s):</h5>
                            <TherapyRecommendationFormReferenceInput
                                data={therapyRecommendation}
                                onChange={references =>
                                    (therapyRecommendation.references = references)
                                }
                            />
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        type="button"
                        bsStyle="default"
                        onClick={() => {
                            this.props.onHide(undefined);
                        }}
                    >
                        Dismiss
                    </Button>
                    <Button
                        type="button"
                        bsStyle="primary"
                        onClick={() => {
                            this.props.onHide(therapyRecommendation);
                        }}
                    >
                        Save Changes
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
}
