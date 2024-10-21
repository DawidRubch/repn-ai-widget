export type BarHeights = [number, number, number];

export const updateBarHeights = (
    params: {
        analyser: AnalyserNode,
        scaleFactorMultiplier?: number;
    }
) => {
    const { analyser, scaleFactorMultiplier = 0.5 } = params;

    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    analyser.getByteFrequencyData(dataArray);


    const newHeights: BarHeights = [0, 0, 0];
    const updateOrder = [1, 0, 2]; // Middle, then left, then right


    for (let i = 0; i < 3; i++) {
        const barIndex = updateOrder[i];
        const distanceFromMiddle = Math.abs(1 - barIndex);
        const dataIndex = Math.floor(dataArray.length / 2) - distanceFromMiddle;
        const value = dataArray[dataIndex];
        const percent = value / 255;

        newHeights[barIndex] = 3 * percent * 100 * scaleFactorMultiplier;
    }

    return newHeights;

};
