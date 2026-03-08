from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.linear_model import LinearRegression

try:
    from statsmodels.tsa.arima.model import ARIMA
except Exception:
    ARIMA = None


@dataclass
class ForecastResult:
    prediction: float
    model_used: str


def _mae(actual: list[float], predicted: list[float]) -> float:
    if not actual:
        return 0.0
    return float(np.mean(np.abs(np.array(actual) - np.array(predicted))))


def _moving_average(values: list[float], window: int = 3) -> float:
    if not values:
        return 0.0
    w = min(window, len(values))
    return float(np.mean(values[-w:]))


def _linear_regression_predict(values: list[float]) -> float:
    if not values:
        return 0.0
    x = np.arange(len(values)).reshape(-1, 1)
    y = np.array(values)
    model = LinearRegression()
    model.fit(x, y)
    next_x = np.array([[len(values)]])
    pred = float(model.predict(next_x)[0])
    return max(pred, 0.0)


def _arima_predict(values: list[float]) -> float:
    if ARIMA is None or len(values) < 8:
        raise ValueError("ARIMA unavailable or insufficient history")
    model = ARIMA(values, order=(1, 1, 1))
    fitted = model.fit()
    pred = float(fitted.forecast(steps=1)[0])
    return max(pred, 0.0)


def forecast_next(values: list[float]) -> ForecastResult:
    if not values:
        return ForecastResult(prediction=0.0, model_used="none")

    ma_pred = _moving_average(values)
    lr_pred = _linear_regression_predict(values)

    eval_actual = values[-3:] if len(values) >= 4 else values
    ma_eval = [ma_pred] * len(eval_actual)
    lr_eval = [lr_pred] * len(eval_actual)

    candidates: list[tuple[str, float, float]] = [
        ("moving_average", ma_pred, _mae(eval_actual, ma_eval)),
        ("linear_regression", lr_pred, _mae(eval_actual, lr_eval)),
    ]

    if ARIMA is not None and len(values) >= 8:
        try:
            arima_pred = _arima_predict(values)
            arima_eval = [arima_pred] * len(eval_actual)
            candidates.append(("arima", arima_pred, _mae(eval_actual, arima_eval)))
        except Exception:
            pass

    model_used, prediction, _ = min(candidates, key=lambda item: item[2])
    return ForecastResult(prediction=max(prediction, 0.0), model_used=model_used)
