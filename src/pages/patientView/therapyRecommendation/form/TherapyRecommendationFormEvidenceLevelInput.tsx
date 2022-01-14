import React from 'react';
import {
    ITherapyRecommendation,
    EvidenceLevel,
    EvidenceLevelExtension,
} from 'shared/model/TherapyRecommendation';
import Select from 'react-select';
import _ from 'lodash';
import { components } from 'react-select';
import { getTooltipEvidenceContent } from '../TherapyRecommendationTableUtils';
import styles from '../style/therapyRecommendation.module.scss';
import {
    DefaultTooltip,
    placeArrowBottomLeft,
} from 'cbioportal-frontend-commons';
import { Checkbox, Col, Row } from 'react-bootstrap';

interface TherapyRecommendationFormEvidenceLevelInputProps {
    data: ITherapyRecommendation;
    onChange: (evidenceLevel: EvidenceLevel) => void;
    onChangeExtension: (evidenceLevelExtension: EvidenceLevelExtension) => void;
}

type MyOption = { label: string; value: string };

export default class TherapyRecommendationFormEvidenceLevelInput extends React.Component<
    TherapyRecommendationFormEvidenceLevelInputProps,
    {
        isM3Disabled: boolean;
        isM1Disabled: boolean;
        isValue: boolean;
        ivValue: boolean;
        rValue: boolean;
        zValue: {};
    }
> {
    constructor(props: TherapyRecommendationFormEvidenceLevelInputProps) {
        super(props);

        this.state = {
            isM3Disabled:
                this.props.data.evidenceLevel.toString() !==
                EvidenceLevel[EvidenceLevel.m3].toString(),
            isM1Disabled: !this.props.data.evidenceLevel.toString().match('m1'),
            isValue:
                this.props.data.evidenceLevelExtension.toString() ==
                EvidenceLevelExtension.IS,
            ivValue:
                this.props.data.evidenceLevelExtension.toString() ===
                EvidenceLevelExtension.IV,
            rValue:
                this.props.data.evidenceLevelExtension.toString() ===
                EvidenceLevelExtension.R,
            zValue:
                this.props.data.evidenceLevelExtension ===
                    EvidenceLevelExtension.ZFDA ||
                this.props.data.evidenceLevelExtension ===
                    EvidenceLevelExtension.ZEMA
                    ? {
                          label: this.props.data.evidenceLevelExtension,
                          value: this.props.data.evidenceLevelExtension,
                      }
                    : {},
        };
    }
    public render() {
        const Option = (props: any) => {
            return (
                <div>
                    <components.Option {...props}>
                        <span style={{ marginRight: 5 }}>{props.label}</span>
                        <DefaultTooltip
                            placement="bottomLeft"
                            trigger={['hover', 'focus']}
                            overlay={getTooltipEvidenceContent(props.label)}
                            destroyTooltipOnHide={false}
                            onPopupAlign={placeArrowBottomLeft}
                        >
                            <i
                                className={'fa fa-info-circle ' + styles.icon}
                            ></i>
                        </DefaultTooltip>
                    </components.Option>
                </div>
            );
        };

        const evidenceLevelDefault = {
            label: this.props.data.evidenceLevel || 'NA',
            value: EvidenceLevel[this.props.data.evidenceLevel],
        };
        console.log(evidenceLevelDefault);
        const evidenceLevelOptions = Object.entries(EvidenceLevel)
            .filter(([key, value]) => typeof value === 'string')
            .map(([key, value]) => ({
                label: value,
                value: key,
            }));
        const evidenceLevelApprovalOptions = Object.entries(
            EvidenceLevelExtension
        )
            .filter(
                ([key, value]) =>
                    typeof value === 'string' && value.startsWith('Z')
            )
            .map(([key, value]) => ({
                label: value,
                value: key,
            }));

        const setExtension = (extension: EvidenceLevelExtension) => {
            this.setState({
                isValue: false,
                ivValue: false,
                rValue: false,
                zValue: {},
            });
            this.props.onChangeExtension(extension);
        };

        return (
            <Row>
                <Col xs={3}>
                    <Select
                        options={evidenceLevelOptions}
                        defaultValue={evidenceLevelDefault}
                        components={{ Option }}
                        name="evidenceLevel"
                        className="basic-select"
                        classNamePrefix="select"
                        onChange={(selectedOption: MyOption) => {
                            this.props.onChange(
                                EvidenceLevel[
                                    selectedOption.value as keyof typeof EvidenceLevel
                                ]
                            );
                            this.props.onChangeExtension(
                                EvidenceLevelExtension.NA
                            );
                            this.setState({
                                isM3Disabled:
                                    this.props.data.evidenceLevel.toString() !==
                                    EvidenceLevel[EvidenceLevel.m3].toString(),
                                isM1Disabled: !this.props.data.evidenceLevel
                                    .toString()
                                    .match('m1'),
                                isValue: false,
                                ivValue: false,
                                rValue: false,
                                zValue: {},
                            });
                            console.log(
                                !this.props.data.evidenceLevel
                                    .toString()
                                    .match('m1')
                            );
                        }}
                    />
                </Col>
                <Col xs={3}>
                    <Select
                        options={evidenceLevelApprovalOptions}
                        isDisabled={this.state.isM1Disabled}
                        defaultValue={{ label: '', value: '' }}
                        onChange={(selectedOption: MyOption) => {
                            setExtension(
                                EvidenceLevelExtension[
                                    selectedOption.value as keyof typeof EvidenceLevelExtension
                                ]
                            );
                            this.setState({ zValue: selectedOption });
                        }}
                        value={this.state.zValue}
                        name="evidenceLevelApproval"
                        className="basic-select"
                        classNamePrefix="select"
                    />
                </Col>
                <Col xs={2}>
                    <Checkbox
                        default={false}
                        name="evidenceLevelIs"
                        disabled={this.state.isM3Disabled}
                        checked={this.state.isValue}
                        onChange={() => {
                            setExtension(EvidenceLevelExtension.IS);
                            this.setState({ isValue: !this.state.isValue });
                        }}
                        inline={true}
                    >
                        is
                    </Checkbox>
                </Col>
                <Col xs={2}>
                    <Checkbox
                        default={false}
                        name="evidenceLevelIv"
                        disabled={this.state.isM3Disabled}
                        checked={this.state.ivValue}
                        onChange={() => {
                            setExtension(EvidenceLevelExtension.IV);
                            this.setState({ ivValue: !this.state.ivValue });
                        }}
                        inline={true}
                    >
                        iv
                    </Checkbox>
                </Col>
                <Col xs={2}>
                    <Checkbox
                        default={false}
                        inline={true}
                        name="evidenceLevelR"
                        checked={this.state.rValue}
                        onChange={() => {
                            setExtension(EvidenceLevelExtension.R);
                            this.setState({ rValue: !this.state.rValue });
                        }}
                    >
                        R
                    </Checkbox>
                </Col>
            </Row>
        );
    }
}
