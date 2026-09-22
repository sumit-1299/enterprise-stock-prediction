def time_series_split(
    df,
    train_ratio=0.70,
    validation_ratio=0.15,
):
    """
    Split time-series data chronologically.

    Train:      70%
    Validation: 15%
    Test:       15%
    """

    total_rows = len(df)

    train_end = int(
        total_rows * train_ratio
    )

    validation_end = int(
        total_rows *
        (train_ratio + validation_ratio)
    )

    train = df.iloc[
        :train_end
    ].copy()

    validation = df.iloc[
        train_end:validation_end
    ].copy()

    test = df.iloc[
        validation_end:
    ].copy()

    return train, validation, test